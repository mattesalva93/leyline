import type { PrintCountsByLang } from '@leyline/core';
import { useTranslation } from 'react-i18next';
import { LanguagePicker } from '../../language/LanguagePicker.tsx';
import { PrintCountHeading } from './PrintCountHeading.tsx';
import type { GuidedStepPlacement } from '../guide/GuidedStepBubble.tsx';
import { PrintGrid, type PrintGridProps } from './PrintGrid.tsx';
import { PrintPickerSection } from './PrintPickerSection.tsx';
import { PrintSearchField } from './PrintSearchField.tsx';
import type { PrintPickerView } from './use-print-picker-view.ts';

type PrintPickerProps = Omit<PrintGridProps, 'columns' | 'pickerView'> & {
  /** The language of the prints shown, and the print to bring into view. */
  readonly pickerView: PrintPickerView;
  /** How many prints the card has in each language; `null` while not known. */
  readonly printCounts: PrintCountsByLang | null;
  readonly guidedStepPlacement: GuidedStepPlacement;
};

/**
 * The print picker of a wide screen: its title, the language of its prints, a print query
 * typed to narrow them, and the grid of the prints in as many columns as fit.
 */
export function PrintPicker({
  pickerView,
  printCounts,
  guidedStepPlacement,
  ...gridProps
}: PrintPickerProps) {
  const { t } = useTranslation();
  const { line, printQuery, printPages } = gridProps;
  return (
    <PrintPickerSection line={line} guidedStepPlacement={guidedStepPlacement}>
      <PrintCountHeading total={printPages.total} isSearching={printQuery.searched !== ''} />
      <LanguagePicker
        label={t('printPicker.lang')}
        selectedLang={pickerView.printsLang}
        onChange={pickerView.changePrintsLang}
        printCounts={printCounts}
      />
      <PrintSearchField printQuery={printQuery} className="mt-2" />
      <PrintGrid {...gridProps} pickerView={pickerView} columns="auto-fill" />
    </PrintPickerSection>
  );
}
