import { useTranslation } from 'react-i18next';
import { PRIMARY_BUTTON } from '../../ui/board-styles.ts';
import { Icon } from '../../ui/Icon.tsx';
import type { PdfStatus, SheetPdf } from '../../generator/use-sheet-pdf.ts';

/** The PDF button, with how far the PDF has got beside it. */
export function PdfControl({
  pdf,
  className = '',
}: {
  readonly pdf: SheetPdf;
  readonly className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center justify-end gap-3 text-sm ${className}`}>
      <PdfNotes pdf={pdf} />
      <PdfButton pdf={pdf} className={PRIMARY_BUTTON} />
    </div>
  );
}

/** The button that makes the PDF, or shares the one waiting to be shared. */
export function PdfButton({
  pdf,
  className,
}: {
  readonly pdf: SheetPdf;
  readonly className: string;
}) {
  const { t } = useTranslation();

  function buttonLabel(): string {
    if (pdf.isGenerating) return t('pdf.generating');
    if (pdf.fileToShare) return t('pdf.saveOrShare');
    return pdf.sharesPdf ? t('pdf.create') : t('pdf.download');
  }

  return (
    <button
      type="button"
      className={className}
      disabled={!pdf.isAvailable}
      onClick={pdf.makeOrShare}
    >
      <Icon name="download" />
      {buttonLabel()}
    </button>
  );
}

/** How far the PDF has got: its progress, the PDF waiting to be shared, or its failure. */
export function PdfNotes({ pdf }: { readonly pdf: SheetPdf }) {
  const { t } = useTranslation();
  return (
    <>
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
    </>
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
