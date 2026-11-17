import {
  previewPrint,
  type AllocationChoice,
  type Print,
  type PrintWarning,
  type ResolvedLine,
} from '@mtg-suite/core';
import { useRef, useState } from 'react';
import { CopyBreakdown } from './CopyBreakdown.tsx';
import { useTranslation } from 'react-i18next';
import { contentWidthOf, printPageSize } from './print-picker-geometry.ts';
import { PrintPicker } from './PrintPicker.tsx';
import { PrintWarningNote } from './PrintWarningNote.tsx';
import { NORMAL_IMAGE } from './scryfall-image-sizes.ts';
import { SYMBOL_BUTTON } from './ui/board-styles.ts';
import { usePrintPages } from './use-print-pages.ts';
import { usePrintCounts } from './use-print-counts.ts';
import { usePrintPickerView } from './use-print-picker-view.ts';
import { usePrintQuery } from './use-print-query.ts';
import { CARD_SHAPE } from './card-shape.ts';

interface LinePanelProps {
  readonly line: ResolvedLine;
  /** The print of the tile the panel was opened from: the print picker opens on it. */
  readonly tilePrint: Print | null;
  /** Grows each time the user presses a tile, the selected one included: it empties the print query. */
  readonly tileSelectionCount: number;
  /** What to warn about the print of the tile the panel was opened from. */
  readonly printWarning: PrintWarning | null;
  readonly onQuantityChange: (quantity: number) => void;
  /** Called with the allocations a tap in the print picker sets, moving the tile's copies to `toPrint`. */
  readonly onTileCopiesMove: (allocations: AllocationChoice, toPrint: Print) => void;
  /** Gives `print` `quantity` copies, the line's quantity changing as many. */
  readonly onPrintQuantityChange: (print: Print, quantity: number) => void;
}

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
  const panelRef = useRef<HTMLDivElement>(null);
  const [openingQuantity] = useState(line.quantity);
  const printCounts = usePrintCounts(line.card.oracleId);
  const pickerView = usePrintPickerView(tilePrint, line, printCounts);
  const printQuery = usePrintQuery(tileSelectionCount);
  const printPages = usePrintPages(
    line.card.oracleId,
    pickerView.printsLang,
    printQuery.searched,
    () => {
      const panel = panelRef.current;
      const gridWidth = panel ? contentWidthOf(panel) : window.innerWidth;
      return printPageSize(gridWidth, window.innerHeight);
    },
  );
  const frontFace = previewPrint(line)?.faces[0];
  return (
    <div ref={panelRef} className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        {frontFace && (
          <img
            className="block w-20 shrink-0"
            style={CARD_SHAPE}
            src={frontFace.imageUris.normal}
            alt={t('line.imageAlt', { name: frontFace.name })}
            width={NORMAL_IMAGE.width}
            height={NORMAL_IMAGE.height}
          />
        )}
        <h3 className="text-lg leading-tight font-bold">{line.card.name}</h3>
      </div>
      <PrintWarningNote
        line={line}
        warning={printWarning}
        onShowEnglishPrints={() => pickerView.changePrintsLang('en')}
      />
      <fieldset className="flex items-center gap-2">
        <legend className="float-left mr-3 font-semibold">{t('panel.quantity')}</legend>
        <button
          type="button"
          className={SYMBOL_BUTTON}
          aria-label={t('panel.decrease')}
          disabled={line.quantity <= 1}
          onClick={() => onQuantityChange(line.quantity - 1)}
        >
          {t('panel.minus')}
        </button>
        <output aria-live="polite" className="min-w-[2ch] text-center font-mono font-bold">
          {line.quantity}
        </output>
        <button
          type="button"
          className={SYMBOL_BUTTON}
          aria-label={t('panel.increase')}
          onClick={() => onQuantityChange(line.quantity + 1)}
        >
          {t('panel.plus')}
        </button>
      </fieldset>
      <CopyBreakdown line={line} openingQuantity={openingQuantity} />
      <PrintPicker
        line={line}
        tilePrint={tilePrint}
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
