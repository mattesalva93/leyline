import {
  defaultSheetOptions,
  generateSheetPdf,
  hasPrintableCopies,
  sheetImageUrls,
  type DecklistLine,
} from '@mtg-suite/core';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchImages, resolveDecklistText } from './api.ts';
import { DecklistLineItem } from './DecklistLineItem.tsx';
import { Footer } from './Footer.tsx';

type Status = 'idle' | 'resolving' | 'resolveFailed' | 'generating' | 'pdfFailed';

export function App() {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [lines, setLines] = useState<DecklistLine[]>([]);
  const [status, setStatus] = useState<Status>('idle');

  async function resolve(event: FormEvent) {
    event.preventDefault();
    setStatus('resolving');
    try {
      setLines(await resolveDecklistText(text));
      setStatus('idle');
    } catch {
      setStatus('resolveFailed');
    }
  }

  async function downloadPdf() {
    setStatus('generating');
    try {
      const sheet = { options: defaultSheetOptions, lines };
      const pdf = await generateSheetPdf(sheet, await fetchImages(sheetImageUrls(sheet)));
      download(pdf, t('pdf.fileName'));
      setStatus('idle');
    } catch {
      setStatus('pdfFailed');
    }
  }

  const busy = status === 'resolving' || status === 'generating';
  const printable = hasPrintableCopies({ options: defaultSheetOptions, lines });

  return (
    <div className="page">
      <main className="content">
        <h1>{t('app.title')}</h1>
        <p>{t('app.intro')}</p>
        <form className="decklist-form" onSubmit={resolve}>
          <label htmlFor="decklist">{t('decklist.label')}</label>
          <textarea
            id="decklist"
            rows={8}
            value={text}
            placeholder={t('decklist.placeholder')}
            onChange={(event) => setText(event.target.value)}
          />
          <button type="submit" disabled={busy || text.trim() === ''}>
            {status === 'resolving' ? t('decklist.resolving') : t('decklist.resolve')}
          </button>
          {status === 'resolveFailed' && <p role="alert">{t('decklist.error')}</p>}
        </form>
        {lines.length > 0 && (
          <>
            <ul className="lines">
              {lines.map((line, index) => (
                <DecklistLineItem key={index} line={line} />
              ))}
            </ul>
            <button type="button" disabled={busy || !printable} onClick={downloadPdf}>
              {status === 'generating' ? t('pdf.generating') : t('pdf.download')}
            </button>
            {status === 'pdfFailed' && <p role="alert">{t('pdf.error')}</p>}
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
