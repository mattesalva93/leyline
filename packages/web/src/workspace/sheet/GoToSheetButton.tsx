import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { PRIMARY_BUTTON } from '../../ui/board-styles.ts';

/**
 * The cards view's way on to the sheet. While the sheet has nothing to print, a line beside it
 * says why, in words a touch screen and the keyboard reach as well as a pointer.
 */
export function GoToSheetButton({
  sheetHasSomethingToPrint,
  onGoToSheet,
  className = '',
}: {
  readonly sheetHasSomethingToPrint: boolean;
  readonly onGoToSheet: () => void;
  readonly className?: string;
}) {
  const { t } = useTranslation();
  const reasonId = useId();
  return (
    <div className={`flex flex-wrap items-center justify-end gap-3 text-sm ${className}`}>
      {!sheetHasSomethingToPrint && (
        <p id={reasonId} className="max-w-xs text-xs text-muted-foreground">
          {t('workspace.goToSheetUnavailable')}
        </p>
      )}
      <button
        type="button"
        className={PRIMARY_BUTTON}
        disabled={!sheetHasSomethingToPrint}
        aria-describedby={sheetHasSomethingToPrint ? undefined : reasonId}
        onClick={onGoToSheet}
      >
        {t('workspace.goToSheet')}
      </button>
    </div>
  );
}
