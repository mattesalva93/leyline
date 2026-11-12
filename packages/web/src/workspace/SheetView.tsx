import { useTranslation } from 'react-i18next';
import { SheetPreview } from '../SheetPreview.tsx';
import type { Generator } from '../use-generator.ts';
import { PrintNotes } from './PrintNotes.tsx';

/** The centre of the workspace in the "sheet" view: the page as it will print. */
export function SheetView({ generator }: { readonly generator: Generator }) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[70dvh] flex-1 flex-col gap-3 pb-2 lg:min-h-0">
      <PrintNotes unprintedCount={generator.unprintedCount} />
      {generator.sheetLayout ? (
        <SheetPreview layout={generator.sheetLayout} />
      ) : (
        <p className="m-auto text-sm text-muted-foreground">{t('workspace.nothingToPrint')}</p>
      )}
    </div>
  );
}
