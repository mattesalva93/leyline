import type { ReactElement } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import {
  CenteredDialogContent,
  Dialog,
  DialogClose,
  DialogTitle,
  DialogTrigger,
} from '../ui/Dialog.tsx';

/** The owner's own address until a dedicated one replaces it; `SECURITY.md` names it too. */
const CONTACT_EMAIL = 'salvalaggiomatteo93@gmail.com';

const LINK = 'text-link underline';

/**
 * The links a paragraph of the notice may hold, by the tag its text wraps them in. Plain `<a>`
 * elements: `Trans` gives the wrapped words to the element as its children.
 */
const LINKS: Readonly<Record<string, ReactElement>> = {
  email: <a className={LINK} href={`mailto:${CONTACT_EMAIL}`} />,
  scryfallPrivacy: (
    <a className={LINK} href="https://scryfall.com/docs/privacy" target="_blank" rel="noreferrer" />
  ),
  garante: (
    <a className={LINK} href="https://www.garanteprivacy.it" target="_blank" rel="noreferrer" />
  ),
};

/** The notice's sections, in the order art. 13 GDPR lists what it owes, by their key in `privacyNotice`. */
const SECTIONS: readonly { readonly key: string; readonly paragraphs: readonly string[] }[] = [
  { key: 'controller', paragraphs: ['who'] },
  { key: 'purpose', paragraphs: ['why', 'legalBasis'] },
  { key: 'data', paragraphs: ['credentials', 'accessLog', 'rateLimit', 'securityEvents'] },
  { key: 'recipients', paragraphs: ['hosting', 'scryfall', 'github'] },
  { key: 'device', paragraphs: ['localStorage'] },
  { key: 'absent', paragraphs: ['nothingElse'] },
  { key: 'rights', paragraphs: ['ask', 'complain'] },
];

/**
 * "Informativa privacy": what personal data the alpha handles, and why, as art. 13 GDPR asks. It
 * opens from its button inside "Informazioni", and closing it goes back there.
 */
export function PrivacyNoticeDialog({ triggerClassName }: { readonly triggerClassName: string }) {
  const { t } = useTranslation();
  return (
    <Dialog>
      <DialogTrigger className={triggerClassName}>{t('privacyNotice.title')}</DialogTrigger>
      <CenteredDialogContent width="wide" className="max-h-[85dvh] overflow-y-auto">
        <DialogTitle className="mb-2 text-base font-bold">{t('privacyNotice.title')}</DialogTitle>
        <p>{t('privacyNotice.intro')}</p>
        {SECTIONS.map(({ key, paragraphs }) => (
          <section key={key} className="mt-4">
            <h3 className="font-bold">{t(`privacyNotice.${key}.heading`)}</h3>
            {paragraphs.map((paragraph) => (
              <p key={paragraph} className="mt-1">
                <Trans
                  i18nKey={`privacyNotice.${key}.${paragraph}`}
                  values={{ email: CONTACT_EMAIL }}
                  components={LINKS}
                />
              </p>
            ))}
          </section>
        ))}
        <DialogClose className="mt-4 rounded-md border-2 border-border bg-accent px-3 py-1.5 font-bold text-accent-foreground">
          {t('privacyNotice.close')}
        </DialogClose>
      </CenteredDialogContent>
    </Dialog>
  );
}
