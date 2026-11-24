import type { Print, ResolvedLine } from '@leyline/core';
import { useRef, useState } from 'react';
import {
  contentWidthOf,
  printPageSize,
  type PrintGridColumns,
} from '../print-picker/print-picker-geometry.ts';
import { usePrintCounts } from '../print-picker/use-print-counts.ts';
import { usePrintPages } from '../print-picker/use-print-pages.ts';
import { usePrintPickerView } from '../print-picker/use-print-picker-view.ts';
import { usePrintQuery } from '../print-picker/use-print-query.ts';

/**
 * What a line panel shows of `line` beside its settings, however it lays them out: how many
 * copies it had on opening, and its print picker's view, query and pages. Each page of prints
 * fills about two screens of a grid as wide as the element `panelRef` holds, in `gridColumns`.
 */
export function useLinePanelPrints(
  line: ResolvedLine,
  tilePrint: Print | null,
  tileSelectionCount: number,
  gridColumns: PrintGridColumns,
) {
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
      return printPageSize(gridWidth, window.innerHeight, gridColumns);
    },
  );
  return { panelRef, openingQuantity, printCounts, pickerView, printQuery, printPages };
}
