import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { PRIMARY_BUTTON } from '../../ui/board-styles.ts';
import { GuidedStepBubble, type GuidedStepPlacement } from '../guide/GuidedStepBubble.tsx';

/**
 * The cards view's way on to the sheet. While the sheet has nothing to print, a line beside it
 * says why, in words a touch screen and the keyboard reach as well as a pointer. The bubble of the
 * guided step that goes to the sheet stands at `guidedStepPlacement`.
 */
export function GoToSheetButton({
  sheetHasSomethingToPrint,
  onGoToSheet,
  guidedStepPlacement,
  className = '',
}: {
  readonly sheetHasSomethingToPrint: boolean;
  readonly onGoToSheet: () => void;
  readonly guidedStepPlacement: GuidedStepPlacement;
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
      <GuidedStepBubble guidedStep="goToSheet" placement={guidedStepPlacement}>
        <button
          type="button"
          className={PRIMARY_BUTTON}
          disabled={!sheetHasSomethingToPrint}
          aria-describedby={sheetHasSomethingToPrint ? undefined : reasonId}
          onClick={onGoToSheet}
        >
          {t('workspace.goToSheet')}
        </button>
      </GuidedStepBubble>
    </div>
  );
}
