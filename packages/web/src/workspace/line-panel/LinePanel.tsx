import {
  previewPrint,
  type AllocationChoice,
  type Print,
  type PrintWarning,
  type ResolvedLine,
} from '@leyline/core';
import { useTranslation } from 'react-i18next';
import { CARD_SHAPE } from '../card-image/card-shape.ts';
import { CopyBreakdown } from './CopyBreakdown.tsx';
import { LineQuantityField } from './LineQuantityField.tsx';
import type { GuidedStepPlacement } from '../guide/GuidedStepBubble.tsx';
import { PrintPicker } from '../print-picker/PrintPicker.tsx';
import { PrintWarningNote } from './PrintWarningNote.tsx';
import { NORMAL_IMAGE } from '../card-image/scryfall-image-sizes.ts';
import { useLinePanelPrints } from './use-line-panel-prints.ts';
import { FadingInImage } from '../card-image/FadingInImage.tsx';
import { AlternateNameTag } from '../card-image/AlternateNameTag.tsx';

export interface LinePanelProps {
  readonly line: ResolvedLine;
  /** The print of the tile the panel was opened from: the print picker opens on it. */
  readonly tilePrint: Print | null;
  /** Grows each time the user presses a tile, the selected one included: it empties the print query. */
  readonly tileSelectionCount: number;
  /** What to warn about the print of the tile the panel was opened from. */
  readonly printWarning: PrintWarning | null;
  readonly onQuantityChange: (quantity: number) => void;
  /** Called with the choice a tap in the print picker sets, moving the tile's copies to `toPrint`. */
  readonly onTileCopiesMove: (choice: AllocationChoice, toPrint: Print) => void;
  /** Gives `print` `quantity` copies, the line's quantity changing as many. */
  readonly onPrintQuantityChange: (print: Print, quantity: number) => void;
}

/**
 * Out over the dimmed centre, left of the inspector the picker stands in: its arrow enters the
 * picker by its first prints.
 */
const PRINT_PICKER_BUBBLE_PLACEMENT: GuidedStepPlacement = {
  side: 'left',
  aimInside: (picker) => ({ x: picker.left + 40, y: picker.top + 150 }),
};

/** The settings of one line: its quantity and the prints its copies use, in either language. */
export function LinePanel({
  line,
  tilePrint,
  tileSelectionCount,
  printWarning,
  onQuantityChange,
  onTileCopiesMove,
  onPrintQuantityChange,
}: LinePanelProps) {
  const { t } = useTranslation();
  const { panelRef, openingQuantity, printCounts, pickerView, printQuery, printPages } =
    useLinePanelPrints(line, tilePrint, tileSelectionCount, 'auto-fill');
  const frontFace = previewPrint(line)?.faces[0];
  return (
    <div ref={panelRef} className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        {frontFace && (
          <FadingInImage
            className="block w-20 shrink-0"
            style={CARD_SHAPE}
            src={frontFace.imageUris.normal}
            alt={t('line.imageAlt', { name: frontFace.name })}
            width={NORMAL_IMAGE.width}
            height={NORMAL_IMAGE.height}
          />
        )}
        <div className="flex flex-col gap-1">
          <h3 className="text-lg leading-tight font-bold">{line.card.name}</h3>
          <AlternateNameTag
            alternateName={tilePrint?.flavorName ?? null}
            cardName={line.card.name}
            showsAlternateName
          />
        </div>
      </div>
      <PrintWarningNote
        line={line}
        warning={printWarning}
        onShowEnglishPrints={() => pickerView.changePrintsLang('en')}
      />
      <LineQuantityField quantity={line.quantity} onQuantityChange={onQuantityChange} />
      <CopyBreakdown line={line} openingQuantity={openingQuantity} />
      <PrintPicker
        line={line}
        tilePrint={tilePrint}
        guidedStepPlacement={PRINT_PICKER_BUBBLE_PLACEMENT}
        pickerView={pickerView}
        printCounts={printCounts}
        printQuery={printQuery}
        printPages={printPages}
        onTileCopiesMove={onTileCopiesMove}
        onPrintQuantityChange={onPrintQuantityChange}
      />
    </div>
  );
}
