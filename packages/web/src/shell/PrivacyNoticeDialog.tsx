import type { ReactElement } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { errorReportingIsOn } from '../error-reporting/error-reporting-is-on.ts';
import { productEventsAreOn } from '../product-events/product-events-are-on.ts';
import {
  CenteredDialogContent,
  Dialog,
  DialogClose,
  DialogTitle,
  DialogTrigger,
} from '../ui/Dialog.tsx';
import { PRIMARY_BUTTON } from '../ui/board-styles.ts';

/** `SECURITY.md` repeats it by hand: GitHub shows that file on its own, so it cannot import this. */
const CONTACT_EMAIL = 'mtgsuite@proton.me';

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

/** What the notice tells apart, because it describes only what this build has on (ADR 0027). */
interface ToolsSwitchedOn {
  readonly errorReports: boolean;
  readonly productEvents: boolean;
}

/** A paragraph by its key, shown always, or only while `shown` holds for the tools on. */
type Paragraph =
  string | { readonly key: string; readonly shown: (toolsOn: ToolsSwitchedOn) => boolean };

const WITH_ERROR_REPORTS = ({ errorReports }: ToolsSwitchedOn) => errorReports;
const WITH_PRODUCT_EVENTS = ({ productEvents }: ToolsSwitchedOn) => productEvents;
const WITHOUT_PRODUCT_EVENTS = ({ productEvents }: ToolsSwitchedOn) => !productEvents;
const WITH_NO_TOOL = ({ errorReports, productEvents }: ToolsSwitchedOn) =>
  !errorReports && !productEvents;
const WITH_A_TOOL = (toolsOn: ToolsSwitchedOn) => !WITH_NO_TOOL(toolsOn);
const WITH_ERROR_REPORTS_ALONE = ({ errorReports, productEvents }: ToolsSwitchedOn) =>
  errorReports && !productEvents;
const WITH_PRODUCT_EVENTS_ALONE = ({ errorReports, productEvents }: ToolsSwitchedOn) =>
  productEvents && !errorReports;
const WITH_BOTH_TOOLS = ({ errorReports, productEvents }: ToolsSwitchedOn) =>
  errorReports && productEvents;

/** The notice's sections, in the order art. 13 GDPR lists what it owes, by their key in `privacyNotice`. */
const SECTIONS: readonly { readonly key: string; readonly paragraphs: readonly Paragraph[] }[] = [
  { key: 'controller', paragraphs: ['who'] },
  {
    key: 'purpose',
    paragraphs: [
      // One purpose paragraph names every tool on, so that the purposes read as one sentence.
      { key: 'why', shown: WITH_NO_TOOL },
      { key: 'whyWithErrorReports', shown: WITH_ERROR_REPORTS_ALONE },
      { key: 'whyWithProductEvents', shown: WITH_PRODUCT_EVENTS_ALONE },
      { key: 'whyWithErrorReportsAndProductEvents', shown: WITH_BOTH_TOOLS },
      { key: 'legalBasis', shown: WITH_NO_TOOL },
      { key: 'legalBasisWithTools', shown: WITH_A_TOOL },
    ],
  },
  {
    key: 'data',
    paragraphs: [
      'credentials',
      'accessLog',
      'rateLimit',
      'securityEvents',
      { key: 'errorReports', shown: WITH_ERROR_REPORTS },
      { key: 'productEvents', shown: WITH_PRODUCT_EVENTS },
    ],
  },
  {
    key: 'recipients',
    paragraphs: ['hosting', 'scryfall', { key: 'bugsink', shown: WITH_ERROR_REPORTS }, 'github'],
  },
  { key: 'device', paragraphs: ['localStorage'] },
  {
    key: 'absent',
    paragraphs: [
      { key: 'nothingElse', shown: WITHOUT_PRODUCT_EVENTS },
      { key: 'nothingElseWithProductEvents', shown: WITH_PRODUCT_EVENTS },
    ],
  },
  { key: 'rights', paragraphs: ['ask', 'complain'] },
];

/** The keys of the section's paragraphs shown with the tools on. */
function shownParagraphs(paragraphs: readonly Paragraph[], toolsOn: ToolsSwitchedOn): string[] {
  return paragraphs.flatMap((paragraph) => {
    if (typeof paragraph === 'string') return [paragraph];
    return paragraph.shown(toolsOn) ? [paragraph.key] : [];
  });
}

/**
 * "Informativa privacy": what personal data the alpha handles, and why, as art. 13 GDPR asks. It
 * opens from its button inside "Informazioni", and closing it goes back there.
 */
export function PrivacyNoticeDialog({ triggerClassName }: { readonly triggerClassName: string }) {
  const { t } = useTranslation();
  const toolsOn: ToolsSwitchedOn = {
    errorReports: errorReportingIsOn(),
    productEvents: productEventsAreOn(),
  };
  return (
    <Dialog>
      <DialogTrigger className={triggerClassName}>{t('privacyNotice.title')}</DialogTrigger>
      <CenteredDialogContent width="wide" className="max-h-[85dvh] overflow-y-auto">
        <DialogTitle className="mb-2 text-base font-bold">{t('privacyNotice.title')}</DialogTitle>
        <p>{t('privacyNotice.intro')}</p>
        {SECTIONS.map(({ key, paragraphs }) => (
          <section key={key} className="mt-4">
            <h3 className="font-bold">{t(`privacyNotice.${key}.heading`)}</h3>
            {shownParagraphs(paragraphs, toolsOn).map((paragraph) => (
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
        <DialogClose className={`${PRIMARY_BUTTON} mt-4`}>{t('privacyNotice.close')}</DialogClose>
      </CenteredDialogContent>
    </Dialog>
  );
}
