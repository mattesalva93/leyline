import {
  applyAllocationChoice,
  applyCandidateChoice,
  defaultSheetOptions,
  fitAllocations,
  generateSheetPdf,
  hasPrintableCopies,
  LANGS,
  setLineQuantity,
  sheetImageUrls,
  unprintedLines,
  type AllocationChoice,
  type DecklistLine,
  type Lang,
} from '@mtg-suite/core';
import { useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchImages, resolveDecklistText } from './api.ts';
import { DecklistLineItem } from './DecklistLineItem.tsx';
import { loadDefaultLang, saveDefaultLang } from './default-lang.ts';
import { Footer } from './Footer.tsx';
import { LanguagePicker } from './LanguagePicker.tsx';
import { LinePanel } from './LinePanel.tsx';

type PdfStatus = 'idle' | 'generating' | 'failed';

const LINE_BREAK = /\r?\n/;

/**
 * What the server resolved each written line to, in each language asked for, keyed by
 * `resolutionKey`. `null` marks a written line that names no card (blank, header, comment).
 */
type ResolutionsByLanguage = ReadonlyMap<string, DecklistLine | null>;

function resolutionKey(lang: Lang, writtenLine: string): string {
  return `${lang}:${writtenLine}`;
}

/**
 * What the user picked on one written line, kept apart from its resolution so the picks
 * survive resolving the line again.
 */
interface LineChoices {
  /** Set when the line uses another language than the default one. */
  readonly lang?: Lang;
  /** The card picked among an ambiguous line's candidates. */
  readonly oracleId?: string;
  /** The copies allocated to prints in the print picker. */
  readonly allocations?: AllocationChoice;
}

/** One written line of the decklist, as the list below the text area shows it. */
interface ListItem {
  /** Where the line sits in the decklist text, counting blank lines too. */
  readonly writtenIndex: number;
  readonly writtenLine: string;
  /**
   * `undefined` while the server has not resolved the line yet: it is shown as typed, and it
   * holds the PDF back.
   */
  readonly line: DecklistLine | undefined;
}

export function App() {
  const { t } = useTranslation();
  const [decklistText, setDecklistText] = useState('');
  const [defaultLang, setDefaultLang] = useState(loadDefaultLang);
  const [resolutions, setResolutions] = useState<ResolutionsByLanguage>(new Map());
  const [choicesByLine, setChoicesByLine] = useState<ReadonlyMap<string, LineChoices>>(new Map());
  // The `writtenIndex` of the line whose panel is open.
  const [panelLineIndex, setPanelLineIndex] = useState<number | null>(null);
  const [requestsInFlight, setRequestsInFlight] = useState(0);
  const [lastRequestFailed, setLastRequestFailed] = useState(false);
  const [pdfStatus, setPdfStatus] = useState<PdfStatus>('idle');
  // Every `resolutionKey` already asked for, so a line is sent once per language however often
  // the decklist text changes.
  const requestedKeys = useRef(new Set<string>());

  const languageOf = (writtenLine: string) => choicesByLine.get(writtenLine)?.lang ?? defaultLang;

  /** Resolves the lines not asked for yet in `lang`; `false` when the request failed. */
  async function resolveInLanguage(writtenLines: readonly string[], lang: Lang): Promise<boolean> {
    const notRequested = [...new Set(writtenLines)].filter(
      (writtenLine) => !requestedKeys.current.has(resolutionKey(lang, writtenLine)),
    );
    if (notRequested.length === 0) return true;
    for (const writtenLine of notRequested) {
      requestedKeys.current.add(resolutionKey(lang, writtenLine));
    }
    setRequestsInFlight((count) => count + 1);
    try {
      const resolvedLines = await resolveDecklistText(notRequested.join('\n'), lang);
      setResolutions((previous) => {
        const next = new Map(previous);
        for (const writtenLine of notRequested) next.set(resolutionKey(lang, writtenLine), null);
        for (const line of resolvedLines) next.set(resolutionKey(lang, line.text), line);
        return next;
      });
      setLastRequestFailed(false);
      return true;
    } catch {
      for (const writtenLine of notRequested) {
        requestedKeys.current.delete(resolutionKey(lang, writtenLine));
      }
      setLastRequestFailed(true);
      return false;
    } finally {
      setRequestsInFlight((count) => count - 1);
    }
  }

  /** Resolves each written line in its own language: one request per language. */
  function resolveEachInItsLanguage(
    writtenLines: readonly string[],
    languageOfLine: (writtenLine: string) => Lang = languageOf,
  ) {
    for (const lang of LANGS) {
      void resolveInLanguage(
        writtenLines.filter((writtenLine) => languageOfLine(writtenLine) === lang),
        lang,
      );
    }
  }

  function onDecklistChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const nextText = event.target.value;
    // A new line break (typed or pasted) completes every line before the last one.
    const writtenLines = nextText.split(LINE_BREAK);
    if (writtenLines.length > decklistText.split(LINE_BREAK).length) {
      resolveEachInItsLanguage(writtenLines.slice(0, -1));
    }
    setDecklistText(nextText);
  }

  function updateChoices(writtenLine: string, change: LineChoices) {
    setChoicesByLine((previous) =>
      new Map(previous).set(writtenLine, { ...previous.get(writtenLine), ...change }),
    );
  }

  /** Drops the allocations of each of `writtenLines`: they use prints in their old language. */
  function forgetAllocations(writtenLines: readonly string[]) {
    setChoicesByLine((previous) => {
      const next = new Map(previous);
      for (const writtenLine of writtenLines) {
        const { allocations: _forgotten, ...kept } = previous.get(writtenLine) ?? {};
        if (_forgotten) next.set(writtenLine, kept);
      }
      return next;
    });
  }

  function changeDefaultLanguage(lang: Lang) {
    forgetAllocations(
      decklistText.split(LINE_BREAK).filter((line) => !choicesByLine.get(line)?.lang),
    );
    setDefaultLang(lang);
    saveDefaultLang(lang);
    resolveEachInItsLanguage(
      decklistText.split(LINE_BREAK),
      (writtenLine) => choicesByLine.get(writtenLine)?.lang ?? lang,
    );
  }

  // Switched only once resolved, so the line (and its open panel) never goes back to unresolved.
  async function changeLineLanguage(writtenLine: string, lang: Lang) {
    if (lang === languageOf(writtenLine) || !(await resolveInLanguage([writtenLine], lang))) return;
    forgetAllocations([writtenLine]);
    updateChoices(writtenLine, { lang });
  }

  /**
   * The line to show for `writtenLine`: its resolution in its language with the user's picks
   * (candidate, allocations) applied; `null` when it names no card, `undefined` while not resolved yet.
   */
  function displayedLine(writtenLine: string): DecklistLine | null | undefined {
    const resolution = resolutions.get(resolutionKey(languageOf(writtenLine), writtenLine));
    if (!resolution) return resolution;
    const { oracleId, allocations } = choicesByLine.get(writtenLine) ?? {};
    const withCandidate =
      oracleId === undefined ? resolution : applyCandidateChoice(resolution, oracleId);
    return allocations === undefined
      ? withCandidate
      : applyAllocationChoice(withCandidate, allocations);
  }

  const writtenLines = decklistText.split(LINE_BREAK);

  /**
   * Writes the new quantity into the decklist text itself, so the text always says what gets
   * printed. The rewritten line keeps its resolution and the user's choices: no new request.
   * The quantity goes on the resolution as the server sent it, never on the displayed line:
   * the choices are applied again on top, so nothing they derived goes stale. The allocations
   * are fitted to the new quantity for good, so raising it again leaves the copies taken off on
   * the default print.
   */
  function changeLineQuantity(writtenIndex: number, quantity: number) {
    const writtenLine = writtenLines[writtenIndex];
    if (writtenLine === undefined) return;
    const lang = languageOf(writtenLine);
    const resolution = resolutions.get(resolutionKey(lang, writtenLine));
    if (!resolution) return;
    const rewritten = setLineQuantity(resolution, quantity);
    const key = resolutionKey(lang, rewritten.text);
    requestedKeys.current.add(key);
    setResolutions((previous) => new Map(previous).set(key, rewritten));
    const choices = choicesByLine.get(writtenLine);
    if (choices) {
      const { allocations } = choices;
      updateChoices(rewritten.text, {
        ...choices,
        ...(allocations && { allocations: fitAllocations(allocations, quantity) }),
      });
    }
    setDecklistText(writtenLines.with(writtenIndex, rewritten.text).join('\n'));
  }

  const listItems = writtenLines.flatMap((writtenLine, writtenIndex): ListItem[] => {
    const line = displayedLine(writtenLine);
    if (line === null || (line === undefined && writtenLine.trim() === '')) return [];
    return [{ writtenIndex, writtenLine, line }];
  });
  const panelWrittenLine = panelLineIndex === null ? undefined : writtenLines[panelLineIndex];
  const panelLine = panelWrittenLine === undefined ? undefined : displayedLine(panelWrittenLine);
  const resolvedLines = listItems.flatMap((item) => item.line ?? []);
  const unresolvedCount = listItems.length - resolvedLines.length;
  const sheet = { options: defaultSheetOptions, lines: resolvedLines };
  const unprintedCount = unprintedLines(sheet).length;

  async function downloadPdf() {
    setPdfStatus('generating');
    try {
      const pdf = await generateSheetPdf(sheet, await fetchImages(sheetImageUrls(sheet)));
      saveFile(pdf, t('pdf.fileName'));
      setPdfStatus('idle');
    } catch {
      setPdfStatus('failed');
    }
  }

  return (
    <div className="page">
      <main className="content">
        <h1>{t('app.title')}</h1>
        <p>{t('app.intro')}</p>
        <LanguagePicker
          label={t('app.defaultLang')}
          selectedLang={defaultLang}
          onChange={changeDefaultLanguage}
        />
        <div className="decklist-form">
          <label htmlFor="decklist">{t('decklist.label')}</label>
          <textarea
            id="decklist"
            rows={8}
            value={decklistText}
            placeholder={t('decklist.placeholder')}
            onChange={onDecklistChange}
            onBlur={() => resolveEachInItsLanguage(decklistText.split(LINE_BREAK))}
          />
          <p className="decklist-form__status" aria-live="polite">
            {requestsInFlight > 0 && t('decklist.resolving')}
          </p>
          {lastRequestFailed && <p role="alert">{t('decklist.error')}</p>}
        </div>
        {listItems.length > 0 && (
          <>
            <ul className="lines">
              {listItems.map(({ writtenIndex, writtenLine, line }) =>
                line === undefined ? (
                  <li key={writtenIndex} className="line line--pending">
                    <span className="line__name">{writtenLine.trim()}</span>
                    <span className="line__note">
                      {requestsInFlight > 0 ? t('decklist.resolving') : t('line.pending')}
                    </span>
                  </li>
                ) : (
                  <DecklistLineItem
                    key={writtenIndex}
                    line={line}
                    onPickCandidate={(oracleId) => updateChoices(writtenLine, { oracleId })}
                    onOpenPanel={() => setPanelLineIndex(writtenIndex)}
                    onSwitchLineToEnglish={() => void changeLineLanguage(writtenLine, 'en')}
                  />
                ),
              )}
            </ul>
            {unprintedCount > 0 && (
              <p className="unprinted" role="status">
                {t('pdf.unprinted', { count: unprintedCount })}
              </p>
            )}
            <button
              type="button"
              disabled={
                pdfStatus === 'generating' || unresolvedCount > 0 || !hasPrintableCopies(sheet)
              }
              onClick={downloadPdf}
            >
              {pdfStatus === 'generating' ? t('pdf.generating') : t('pdf.download')}
            </button>
            {pdfStatus === 'failed' && <p role="alert">{t('pdf.error')}</p>}
          </>
        )}
      </main>
      <LinePanel
        line={panelLine?.status === 'resolved' ? panelLine : null}
        onLanguageChange={(lang) =>
          panelWrittenLine !== undefined && void changeLineLanguage(panelWrittenLine, lang)
        }
        onQuantityChange={(quantity) =>
          panelLineIndex !== null && changeLineQuantity(panelLineIndex, quantity)
        }
        onAllocationChoice={(allocations) =>
          panelWrittenLine !== undefined && updateChoices(panelWrittenLine, { allocations })
        }
        onClose={() => setPanelLineIndex(null)}
      />
      <Footer />
    </div>
  );
}

/** Hands `bytes` to the browser as a PDF download named `fileName`. */
function saveFile(bytes: Uint8Array, fileName: string) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  // Revoking right after click() can cancel the download in Firefox and Safari.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
