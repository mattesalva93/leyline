import { PRIMARY_BUTTON } from '../ui/board-styles.ts';
import type { SheetPdf } from '../use-sheet-pdf.ts';
import { PdfButton, PdfNotes } from './PdfControl.tsx';

/** The strip at the foot of a phone's "sheet" step: how far the PDF has got, and its button. */
export function PhonePdfStrip({ pdf }: { readonly pdf: SheetPdf }) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-2 border-t-2 border-border bg-panel p-2 text-center text-sm">
      <PdfNotes pdf={pdf} />
      <PdfButton pdf={pdf} className={PRIMARY_BUTTON} />
    </div>
  );
}
