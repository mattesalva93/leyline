import { useTranslation } from 'react-i18next';
import { BOARD_PANEL } from '../ui/board-styles.ts';
import { LandingPageSection } from './LandingPageSection.tsx';

const FEATURES = ['misspelledNames', 'printAndLang', 'sheet', 'pdfInBrowser'] as const;

/** What the generator can do, as a short list. */
export function GeneratorFeatures() {
  const { t } = useTranslation();
  return (
    <LandingPageSection title={t('landingPage.features.title')}>
      <ul className="grid gap-4 sm:grid-cols-2">
        {FEATURES.map((feature) => (
          <li key={feature} className={`${BOARD_PANEL} px-4 py-3 font-semibold`}>
            {t(`landingPage.features.${feature}`)}
          </li>
        ))}
      </ul>
    </LandingPageSection>
  );
}
