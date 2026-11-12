import { useTranslation } from 'react-i18next';
import { PRIMARY_BUTTON } from '../ui/board-styles.ts';
import { Icon } from '../ui/Icon.tsx';
import type { PdfStatus, SheetPdf } from '../use-sheet-pdf.ts';

/** The PDF button, with how far the PDF has got beside it. */
export function PdfControl({
  pdf,
  className = '',
}: {
  readonly pdf: SheetPdf;
  readonly className?: string;
}) {
  const { t } = useTranslation();

  function buttonLabel(): string {
    if (pdf.isGenerating) return t('pdf.generating');
    if (pdf.fileToShare) return t('pdf.saveOrShare');
    return pdf.sharesPdf ? t('pdf.create') : t('pdf.download');
  }

  return (
    <div className={`flex flex-wrap items-center justify-end gap-3 text-sm ${className}`}>
      {pdf.isGenerating && <PdfProgress status={pdf.status} />}
      {pdf.fileToShare && (
        <p className="max-w-xs text-xs" role="status">
          {t('pdf.readyToShare')}
        </p>
      )}
      {pdf.status.step === 'failed' && (
        <p role="alert" className="text-danger">
          {t('pdf.error')}
        </p>
      )}
      <button
        type="button"
        className={PRIMARY_BUTTON}
        disabled={!pdf.isAvailable}
        onClick={pdf.makeOrShare}
      >
        <Icon name="download" />
        {buttonLabel()}
      </button>
    </div>
  );
}

/** A progress bar for the PDF being generated, with what it is doing now. */
function PdfProgress({ status }: { readonly status: PdfStatus }) {
  const { t } = useTranslation();
  const fetching = status.step === 'fetchingImages';
  return (
    <div className="flex flex-col gap-1 text-xs text-muted-foreground" role="status">
      {/* Without a value the bar shows activity of unknown length: composing the pages. */}
      <progress
        className="w-40 accent-foreground"
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
