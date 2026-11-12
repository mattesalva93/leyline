import { useTranslation } from 'react-i18next';
import {
  CenteredDialogContent,
  Dialog,
  DialogClose,
  DialogTitle,
  DialogTrigger,
} from '../ui/Dialog.tsx';

const ISSUES_URL = 'https://github.com/mattesalva93/mtg-suite/issues';

/**
 * "Informazioni": the disclaimer, the data credit and the link to report a problem, out of the
 * way of the work. It opens from its button in the top bar, or from wherever `onOpenChange`
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
        <DialogClose className="mt-4 rounded-md border-2 border-border bg-accent px-3 py-1.5 font-bold text-accent-foreground">
          {t('info.close')}
        </DialogClose>
      </CenteredDialogContent>
    </Dialog>
  );
}
