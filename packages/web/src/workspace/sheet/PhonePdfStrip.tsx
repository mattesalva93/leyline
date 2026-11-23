import { PRIMARY_BUTTON } from '../../ui/board-styles.ts';
import type { SheetPdf } from '../../generator/use-sheet-pdf.ts';
import type { GuidedStepPlacement } from '../guide/GuidedStepBubble.tsx';
import { PdfButton, PdfNotes } from './PdfControl.tsx';

/**
 * Above the strip, over the foot of the sheet, running back left from its arrow: the button
 * stands in the middle of the screen, too far right for a bubble to run on from it.
 */
const PDF_BUBBLE_PLACEMENT: GuidedStepPlacement = {
  side: 'top',
  align: 'end',
  aimInside: (button) => ({ x: button.right - 24, y: button.top + 8 }),
};

/** The strip at the foot of a phone's "sheet" step: how far the PDF has got, and its button. */
export function PhonePdfStrip({ pdf }: { readonly pdf: SheetPdf }) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-2 border-t-2 border-border bg-panel p-2 text-center text-sm">
      <PdfNotes pdf={pdf} />
      <PdfButton pdf={pdf} guidedStepPlacement={PDF_BUBBLE_PLACEMENT} className={PRIMARY_BUTTON} />
    </div>
  );
}
