import { CARD_MM } from '@mtg-suite/core';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DecklistLineItem } from './DecklistLineItem.tsx';
import { Footer } from './Footer.tsx';
import { LanguagePicker } from './LanguagePicker.tsx';
import { LinePanel } from './LinePanel.tsx';
import { touchIsMainInput } from './pdf-delivery.ts';
import { SheetOptionsForm } from './SheetOptionsForm.tsx';
import { SheetPreview } from './SheetPreview.tsx';
import { useGenerator } from './use-generator.ts';
import type { PdfStatus } from './use-sheet-pdf.ts';

export function App() {
  const { t } = useTranslation();
  const generator = useGenerator();
  // The `writtenIndex` of the line whose panel is open.
  const [panelLineIndex, setPanelLineIndex] = useState<number | null>(null);
  const [touchIsMain] = useState(touchIsMainInput);
  const panelLine = panelLineIndex === null ? undefined : generator.lineAt(panelLineIndex);
  const { cardLines, sheetLayout, pdf } = generator;

  function pdfButtonLabel(): string {
    if (pdf.isGenerating) return t('pdf.generating');
    if (pdf.fileToShare) return t('pdf.saveOrShare');
    return pdf.sharesPdf ? t('pdf.create') : t('pdf.download');
  }

  return (
    <div className="page">
      <main className="content">
        <h1>{t('app.title')}</h1>
        <p>{t('app.intro')}</p>
        <LanguagePicker
          label={t('app.defaultLang')}
          selectedLang={generator.defaultLang}
          onChange={generator.changeDefaultLanguage}
        />
        <div className="decklist-form">
          <label htmlFor="decklist">{t('decklist.label')}</label>
          <textarea
            id="decklist"
            rows={8}
            value={generator.decklistText}
            placeholder={t('decklist.placeholder')}
            onChange={(event) => generator.writeDecklistText(event.target.value)}
            onBlur={generator.resolveEveryLine}
          />
          <p className="decklist-form__status" aria-live="polite">
            {generator.isResolving && t('decklist.resolving')}
          </p>
          {generator.lastResolveFailed && <p role="alert">{t('decklist.error')}</p>}
        </div>
        {cardLines.length > 0 && (
          <>
            <ul className="lines">
              {cardLines.map(({ writtenIndex, writtenLine, line }) =>
                line === undefined ? (
                  <li key={writtenIndex} className="line line--pending">
                    <span className="line__name">{writtenLine.trim()}</span>
                    <span className="line__note">
                      {generator.isResolving ? t('decklist.resolving') : t('line.pending')}
                    </span>
                  </li>
                ) : (
                  <DecklistLineItem
                    key={writtenIndex}
                    line={line}
                    onPickCandidate={(oracleId) => generator.pickCandidate(writtenIndex, oracleId)}
                    onOpenPanel={() => setPanelLineIndex(writtenIndex)}
                    onSwitchLineToEnglish={() => generator.changeLineLanguage(writtenIndex, 'en')}
                  />
                ),
              )}
            </ul>
            {generator.unprintedCount > 0 && (
              <p className="unprinted" role="status">
                {t('pdf.unprinted', { count: generator.unprintedCount })}
              </p>
            )}
            <SheetOptionsForm
              options={generator.sheetOptions}
              onChange={generator.changeSheetOptions}
              warnAboutPngWeight={touchIsMain}
            />
            {sheetLayout && <SheetPreview layout={sheetLayout} />}
            <p className="print-at-actual-size" role="note">
              {t('pdf.printAtActualSize', { width: CARD_MM.width, height: CARD_MM.height })}
            </p>
            <button type="button" disabled={!pdf.isAvailable} onClick={pdf.makeOrShare}>
              {pdfButtonLabel()}
            </button>
            {pdf.fileToShare && (
              <p className="pdf-ready" role="status">
                {t('pdf.readyToShare')}
              </p>
            )}
            {pdf.isGenerating && <PdfProgress status={pdf.status} />}
            {pdf.status.step === 'failed' && <p role="alert">{t('pdf.error')}</p>}
          </>
        )}
      </main>
      <LinePanel
        line={panelLine?.status === 'resolved' ? panelLine : null}
        onLanguageChange={(lang) =>
          panelLineIndex !== null && generator.changeLineLanguage(panelLineIndex, lang)
        }
        onQuantityChange={(quantity) =>
          panelLineIndex !== null && generator.changeLineQuantity(panelLineIndex, quantity)
        }
        onAllocationChoice={(allocations) =>
          panelLineIndex !== null && generator.chooseAllocations(panelLineIndex, allocations)
        }
        onClose={() => setPanelLineIndex(null)}
      />
      <Footer />
    </div>
  );
}

/** A progress bar for the PDF being generated, with what it is doing now. */
function PdfProgress({ status }: { readonly status: PdfStatus }) {
  const { t } = useTranslation();
  const fetching = status.step === 'fetchingImages';
  return (
    <div className="pdf-progress" role="status">
      {/* Without a value the bar shows activity of unknown length: composing the pages. */}
      <progress
        max={fetching ? status.imageCount : undefined}
        value={fetching ? status.fetchedCount : undefined}
      />
      <span>
        {fetching
          ? t('pdf.fetchingImages', { fetched: status.fetchedCount, count: status.imageCount })
          : t('pdf.composingPages')}
      </span>
    </div>
  );
}
