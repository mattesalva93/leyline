import { PRIMARY_BUTTON } from '../ui/board-styles.ts';
import type { Generator } from '../use-generator.ts';
import { PdfButton, PdfNotes } from './PdfControl.tsx';
import { PrintNotes } from './PrintNotes.tsx';

/** A phone's last step: what to know before printing, then the PDF button and its progress. */
export function PdfStep({ generator }: { readonly generator: Generator }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 p-5 text-center text-sm">
      <PrintNotes unprintedCount={generator.unprintedCount} />
      <PdfButton pdf={generator.pdf} className={PRIMARY_BUTTON} />
      <PdfNotes pdf={generator.pdf} />
    </div>
  );
}
