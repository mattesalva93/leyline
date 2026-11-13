import { useTranslation } from 'react-i18next';
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from '../ui/board-styles.ts';
import {
  CenteredDialogContent,
  Dialog,
  DialogClose,
  DialogTitle,
  DialogTrigger,
} from '../ui/Dialog.tsx';

/**
 * "Nuova decklist": once the user confirms, the decklist, its line choices and the sheet options
 * go, on the device too. Closing the question empties nothing.
 */
export function NewDecklistButton({
  onConfirm,
  className = '',
}: {
  readonly onConfirm: () => void;
  readonly className?: string;
}) {
  const { t } = useTranslation();
  return (
    <Dialog>
      <DialogTrigger className={`${SECONDARY_BUTTON} text-xs ${className}`}>
        {t('newDecklist.open')}
      </DialogTrigger>
      <CenteredDialogContent>
        <DialogTitle className="mb-2 text-base font-bold">{t('newDecklist.title')}</DialogTitle>
        <p>{t('newDecklist.warning')}</p>
        <div className="mt-4 flex justify-end gap-3">
          <DialogClose className={SECONDARY_BUTTON}>{t('newDecklist.cancel')}</DialogClose>
          <DialogClose className={PRIMARY_BUTTON} onClick={onConfirm}>
            {t('newDecklist.confirm')}
          </DialogClose>
        </div>
      </CenteredDialogContent>
    </Dialog>
  );
}
