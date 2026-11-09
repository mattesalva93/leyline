import {
  applyCandidateChoice,
  defaultSheetOptions,
  generateSheetPdf,
  hasPrintableCopies,
  LANGS,
  setLineQuantity,
  sheetImageUrls,
  unprintedLines,
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
import { LineSheet } from './LineSheet.tsx';

type PdfStatus = 'idle' | 'generating' | 'failed';

/**
 * What each written line resolved to in a language, keyed by `resolutionKey`; `null` for a
 * line the parser skips (blank, header).
 */
type Resolutions = ReadonlyMap<string, DecklistLine | null>;

/** What the user changed on a written line, kept apart so it survives re-resolving the line. */
interface LineEdits {
  readonly lang?: Lang;
  readonly quantity?: number;
  /** The candidate picked on an ambiguous line. */
  readonly oracleId?: string;
}

function resolutionKey(lang: Lang, written: string): string {
  return `${lang}:${written}`;
}

const LINE_BREAK = /\r?\n/;

/** A written line not resolved yet: shown as typed, and it holds the PDF back. */
interface PendingLine {
  readonly pending: string;
}

export function App() {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [defaultLang, setDefaultLang] = useState(loadDefaultLang);
  const [resolutions, setResolutions] = useState<Resolutions>(new Map());
  const [edits, setEdits] = useState<ReadonlyMap<string, LineEdits>>(new Map());
  // The written text of the line whose panel is open.
  const [openLine, setOpenLine] = useState<string | null>(null);
  const [resolving, setResolving] = useState(0);
  const [resolveFailed, setResolveFailed] = useState(false);
  const [pdfStatus, setPdfStatus] = useState<PdfStatus>('idle');
  // Lines already sent, so a line is resolved once per language however often the text changes.
  const requested = useRef(new Set<string>());

  const langOf = (written: string) => edits.get(written)?.lang ?? defaultLang;

  /** Resolves `texts` in `lang`, unless already asked for; `false` when the request failed. */
  async function resolveLines(texts: readonly string[], lang: Lang): Promise<boolean> {
    const pending = [...new Set(texts)].filter(
      (line) => !requested.current.has(resolutionKey(lang, line)),
    );
    if (pending.length === 0) return true;
    for (const line of pending) requested.current.add(resolutionKey(lang, line));
    setResolving((count) => count + 1);
    try {
      const lines = await resolveDecklistText(pending.join('\n'), lang);
      setResolutions((previous) => {
        const next = new Map(previous);
        for (const line of pending) next.set(resolutionKey(lang, line), null);
        for (const line of lines) next.set(resolutionKey(lang, line.text), line);
        return next;
      });
      setResolveFailed(false);
      return true;
    } catch {
      for (const line of pending) requested.current.delete(resolutionKey(lang, line));
      setResolveFailed(true);
      return false;
    } finally {
      setResolving((count) => count - 1);
    }
  }

  /** Resolves each written line in its own language: one request per language. */
  function resolveWritten(texts: readonly string[], langOfLine = langOf) {
    for (const lang of LANGS) {
      void resolveLines(
        texts.filter((written) => langOfLine(written) === lang),
        lang,
      );
    }
  }

  function onChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const next = event.target.value;
    // A new line break (typed or pasted) completes every line before the last one.
    if (next.split(LINE_BREAK).length > text.split(LINE_BREAK).length) {
      resolveWritten(next.split(LINE_BREAK).slice(0, -1));
    }
    setText(next);
  }

  function edit(written: string, change: LineEdits) {
    setEdits((previous) => new Map(previous).set(written, { ...previous.get(written), ...change }));
  }

  function changeDefaultLang(lang: Lang) {
    setDefaultLang(lang);
    saveDefaultLang(lang);
    resolveWritten(text.split(LINE_BREAK), (written) => edits.get(written)?.lang ?? lang);
  }

  // Switched once resolved, so the line (and its open panel) never goes back to pending.
  async function changeLineLang(written: string, lang: Lang) {
    if (await resolveLines([written], lang)) edit(written, { lang });
  }

  /** A written line as resolved in its language, with the user's edits applied. */
  function lineOf(written: string): DecklistLine | null | undefined {
    const resolution = resolutions.get(resolutionKey(langOf(written), written));
    if (!resolution) return resolution;
    const { quantity, oracleId } = edits.get(written) ?? {};
    const line = oracleId === undefined ? resolution : applyCandidateChoice(resolution, oracleId);
    return quantity === undefined ? line : setLineQuantity(line, quantity);
  }

  // Written lines in order: resolved ones, or the text of those not resolved yet (`pending`).
  const items = text.split(LINE_BREAK).flatMap((written): (DecklistLine | PendingLine)[] => {
    const line = lineOf(written);
    if (line === undefined) return written.trim() === '' ? [] : [{ pending: written }];
    return line ? [line] : [];
  });
  const opened = openLine === null ? null : lineOf(openLine);
  const lines = items.filter((item): item is DecklistLine => !('pending' in item));
  const pending = items.length - lines.length;
  const sheet = { options: defaultSheetOptions, lines };
  const unprinted = unprintedLines(sheet).length;

  async function downloadPdf() {
    setPdfStatus('generating');
    try {
      const pdf = await generateSheetPdf(sheet, await fetchImages(sheetImageUrls(sheet)));
      download(pdf, t('pdf.fileName'));
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
          value={defaultLang}
          onChange={changeDefaultLang}
        />
        <div className="decklist-form">
          <label htmlFor="decklist">{t('decklist.label')}</label>
          <textarea
            id="decklist"
            rows={8}
            value={text}
            placeholder={t('decklist.placeholder')}
            onChange={onChange}
            onBlur={() => resolveWritten(text.split(LINE_BREAK))}
          />
          <p className="decklist-form__status" aria-live="polite">
            {resolving > 0 && t('decklist.resolving')}
          </p>
          {resolveFailed && <p role="alert">{t('decklist.error')}</p>}
        </div>
        {items.length > 0 && (
          <>
            <ul className="lines">
              {items.map((item, index) =>
                'pending' in item ? (
                  <li key={index} className="line line--pending">
                    <span className="line__name">{item.pending.trim()}</span>
                    <span className="line__note">
                      {resolving > 0 ? t('decklist.resolving') : t('line.pending')}
                    </span>
                  </li>
                ) : (
                  <DecklistLineItem
                    key={index}
                    line={item}
                    onChoose={(oracleId) => edit(item.text, { oracleId })}
                    onOpen={() => setOpenLine(item.text)}
                    onUseEnglish={() => void changeLineLang(item.text, 'en')}
                  />
                ),
              )}
            </ul>
            {unprinted > 0 && (
              <p className="unprinted" role="status">
                {t('pdf.unprinted', { count: unprinted })}
              </p>
            )}
            <button
              type="button"
              disabled={pdfStatus === 'generating' || pending > 0 || !hasPrintableCopies(sheet)}
              onClick={downloadPdf}
            >
              {pdfStatus === 'generating' ? t('pdf.generating') : t('pdf.download')}
            </button>
            {pdfStatus === 'failed' && <p role="alert">{t('pdf.error')}</p>}
          </>
        )}
      </main>
      <LineSheet
        line={opened?.status === 'resolved' ? opened : null}
        onLangChange={(lang) => openLine !== null && void changeLineLang(openLine, lang)}
        onQuantityChange={(quantity) => openLine !== null && edit(openLine, { quantity })}
        onClose={() => setOpenLine(null)}
      />
      <Footer />
    </div>
  );
}

function download(bytes: Uint8Array, fileName: string) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  // Revoking right after click() can cancel the download in Firefox and Safari.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
