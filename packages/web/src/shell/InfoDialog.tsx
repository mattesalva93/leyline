import { useTranslation } from 'react-i18next';
import {
  CenteredDialogContent,
  Dialog,
  DialogClose,
  DialogTitle,
  DialogTrigger,
} from '../ui/Dialog.tsx';
import { PRIMARY_BUTTON } from '../ui/board-styles.ts';
import { PrivacyNoticeDialog } from './PrivacyNoticeDialog.tsx';

const ISSUES_URL = 'https://github.com/mattesalva93/leyline/issues';

/**
 * "Informazioni": the disclaimer, the data credit, the link to report a problem and the privacy
 * notice, out of the way of the work. It opens from its button in the top bar, or from wherever `onOpenChange`
 * is called (the phone menu).
 */
export function InfoDialog({
  isOpen,
  onOpenChange,
  triggerClassName,
}: {
  readonly isOpen: boolean;
  readonly onOpenChange: (isOpen: boolean) => void;
  readonly triggerClassName: string;
}) {
  const { t } = useTranslation();
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger className={triggerClassName}>{t('info.title')}</DialogTrigger>
      <CenteredDialogContent>
        <DialogTitle className="mb-2 text-base font-bold">{t('info.title')}</DialogTitle>
        <p>{t('info.disclaimer')}</p>
        <p className="mt-2">{t('info.scryfall')}</p>
        <p className="mt-2">
          <a className="text-link underline" href={ISSUES_URL} target="_blank" rel="noreferrer">
            {t('info.report')}
          </a>
        </p>
        <p className="mt-2">
          <PrivacyNoticeDialog triggerClassName="text-link underline" />
        </p>
        <DialogClose className={`${PRIMARY_BUTTON} mt-4`}>{t('info.close')}</DialogClose>
      </CenteredDialogContent>
    </Dialog>
  );
}
