import { CARD_MM, type SheetLayout } from '@mtg-suite/core';
import { useTranslation } from 'react-i18next';
import { SheetPreview } from '../SheetPreview.tsx';

/** The centre of the workspace in the "sheet" view: the page as it will print. */
export function SheetView({
  sheetLayout,
  unprintedCount,
}: {
  readonly sheetLayout: SheetLayout | null;
  readonly unprintedCount: number;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[70dvh] flex-1 flex-col gap-3 pb-2 lg:min-h-0">
      <p className="font-semibold" role="note">
        {t('pdf.printAtActualSize', { width: CARD_MM.width, height: CARD_MM.height })}
      </p>
      {unprintedCount > 0 && (
        <p className="text-warning" role="status">
          {t('pdf.unprinted', { count: unprintedCount })}
        </p>
      )}
      {sheetLayout ? (
        <SheetPreview layout={sheetLayout} />
      ) : (
        <p className="m-auto text-sm text-muted-foreground">{t('workspace.nothingToPrint')}</p>
      )}
    </div>
  );
}
