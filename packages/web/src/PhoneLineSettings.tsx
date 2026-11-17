import { useTranslation } from 'react-i18next';
import { FoldedCopyBreakdown } from './FoldedCopyBreakdown.tsx';
import { LanguagePicker } from './LanguagePicker.tsx';
import type { LinePanelProps } from './LinePanel.tsx';
import { LineQuantityField } from './LineQuantityField.tsx';
import { PrintCountHeading } from './PrintCountHeading.tsx';
import { PrintGrid } from './PrintGrid.tsx';
import { PHONE_PRINT_GRID_COLUMNS } from './print-picker-geometry.ts';
import { PrintPickerSection } from './PrintPickerSection.tsx';
import { PrintSearchField } from './PrintSearchField.tsx';
import { PrintWarningNote } from './PrintWarningNote.tsx';
import { useLinePanelPrints } from './use-line-panel-prints.ts';

/**
 * The settings of one line laid out for a phone, under the header that names the card: the
 * quantity and the folded breakdown take little room, so the first prints show at once.
 */
export function PhoneLineSettings({
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
    useLinePanelPrints(line, tilePrint, tileSelectionCount, PHONE_PRINT_GRID_COLUMNS);
  return (
    <div ref={panelRef} className="flex flex-col gap-3">
      <PrintWarningNote
        line={line}
        warning={printWarning}
        onShowEnglishPrints={() => pickerView.changePrintsLang('en')}
      />
      <LineQuantityField quantity={line.quantity} onQuantityChange={onQuantityChange} />
      <FoldedCopyBreakdown line={line} openingQuantity={openingQuantity} />
      <PrintPickerSection line={line} className="border-t-2 border-border pt-3">
        <PrintCountHeading total={printPages.total} isSearching={printQuery.searched !== ''} />
        <div className="mt-2 flex items-center gap-2">
          <LanguagePicker
            label={t('printPicker.lang')}
            selectedLang={pickerView.printsLang}
            onChange={pickerView.changePrintsLang}
            printCounts={printCounts}
          />
          <PrintSearchField printQuery={printQuery} className="min-w-0 flex-1" />
        </div>
        <PrintGrid
          line={line}
          tilePrint={tilePrint}
          pickerView={pickerView}
          printQuery={printQuery}
          printPages={printPages}
          columns={PHONE_PRINT_GRID_COLUMNS}
          onTileCopiesMove={onTileCopiesMove}
          onPrintQuantityChange={onPrintQuantityChange}
        />
      </PrintPickerSection>
    </div>
  );
}
