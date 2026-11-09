import {
  chooseCandidate,
  defaultSheetOptions,
  generateSheetPdf,
  hasPrintableCopies,
  sheetImageUrls,
  unprintedLines,
  type DecklistLine,
} from '@mtg-suite/core';
import { useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchImages, resolveDecklistText } from './api.ts';
import { DecklistLineItem } from './DecklistLineItem.tsx';
import { Footer } from './Footer.tsx';

type PdfStatus = 'idle' | 'generating' | 'failed';

/** What each written line resolved to; `null` for a line the parser skips (blank, header). */
type Resolutions = ReadonlyMap<string, DecklistLine | null>;

const LINE_BREAK = /\r?\n/;

/** A written line not resolved yet: shown as typed, and it holds the PDF back. */
interface PendingLine {
  readonly pending: string;
}

export function App() {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [resolutions, setResolutions] = useState<Resolutions>(new Map());
  const [resolving, setResolving] = useState(0);
  const [resolveFailed, setResolveFailed] = useState(false);
  const [pdfStatus, setPdfStatus] = useState<PdfStatus>('idle');
  // Lines already sent, so a line is resolved once however often the text changes.
  const requested = useRef(new Set<string>());

  async function resolveLines(texts: readonly string[]) {
    const pending = [...new Set(texts)].filter((line) => !requested.current.has(line));
    if (pending.length === 0) return;
    for (const line of pending) requested.current.add(line);
    setResolving((count) => count + 1);
    try {
      const lines = await resolveDecklistText(pending.join('\n'));
      setResolutions((previous) => {
        const next = new Map(previous);
        for (const line of pending) next.set(line, null);
        for (const line of lines) next.set(line.text, line);
        return next;
      });
      setResolveFailed(false);
    } catch {
      for (const line of pending) requested.current.delete(line);
      setResolveFailed(true);
    } finally {
      setResolving((count) => count - 1);
    }
  }

  function onChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const next = event.target.value;
    // A new line break (typed or pasted) completes every line before the last one.
    if (next.split(LINE_BREAK).length > text.split(LINE_BREAK).length) {
      void resolveLines(next.split(LINE_BREAK).slice(0, -1));
    }
    setText(next);
  }

  function choose(line: DecklistLine, oracleId: string) {
    if (line.status !== 'ambiguous') return;
    setResolutions((previous) => new Map(previous).set(line.text, chooseCandidate(line, oracleId)));
  }

  // Written lines in order: resolved ones, or the text of those not resolved yet (`pending`).
  const items = text.split(LINE_BREAK).flatMap((written): (DecklistLine | PendingLine)[] => {
    const resolution = resolutions.get(written);
    if (resolution === undefined) return written.trim() === '' ? [] : [{ pending: written }];
    return resolution ? [resolution] : [];
  });
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
        <div className="decklist-form">
          <label htmlFor="decklist">{t('decklist.label')}</label>
          <textarea
            id="decklist"
            rows={8}
            value={text}
            placeholder={t('decklist.placeholder')}
            onChange={onChange}
            onBlur={() => void resolveLines(text.split(LINE_BREAK))}
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
                    <span className="line__note">{t('line.pending')}</span>
                  </li>
                ) : (
                  <DecklistLineItem
                    key={index}
                    line={item}
                    onChoose={(oracleId) => choose(item, oracleId)}
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
