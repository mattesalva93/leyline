import { useTranslation } from 'react-i18next';
import { SECONDARY_BUTTON } from '../../ui/board-styles.ts';

/** Takes a line to fix out of the decklist text: the way out when the user would rather drop it. */
export function RemoveLineButton({
  lineName,
  isInGridCell = false,
  className = '',
  onRemove,
}: {
  /** The card the line names, or the line as written when it names none yet. */
  readonly lineName: string;
  /** Leaves the button out of Tab, which stops on the cell of the card grid it stands in. */
  readonly isInGridCell?: boolean;
  readonly className?: string;
  readonly onRemove: () => void;
}) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      tabIndex={isInGridCell ? -1 : undefined}
      className={`${SECONDARY_BUTTON} ${className}`}
      aria-label={t('line.removeNamed', { name: lineName })}
      onClick={onRemove}
    >
      {t('line.remove')}
    </button>
  );
}
