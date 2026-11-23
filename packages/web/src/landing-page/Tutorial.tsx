import { useTranslation } from 'react-i18next';
import { BOARD_PANEL } from '../ui/board-styles.ts';
import { LandingPageSection } from './LandingPageSection.tsx';
import { tutorialScreenshotAddress } from './tutorial-screenshots.ts';
import { TUTORIAL_SCREENSHOT_SIZE, TUTORIAL_STEPS } from './tutorial-steps.ts';

/**
 * The generator in a few steps, from the decklist to the PDF: each a sentence and a screenshot
 * of the workspace.
 */
export function Tutorial() {
  const { t } = useTranslation();
  return (
    <LandingPageSection title={t('landingPage.tutorial.title')}>
      <ol className="flex flex-col gap-8">
        {TUTORIAL_STEPS.map((step, stepIndex) => (
          <li key={step} className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="grid size-8 shrink-0 place-items-center rounded-md border-2 border-border bg-accent font-mono font-bold text-accent-foreground"
              >
                {stepIndex + 1}
              </span>
              <p className="font-semibold">{t(`landingPage.tutorial.${step}.sentence`)}</p>
            </div>
            <img
              src={tutorialScreenshotAddress(step)}
              alt={t(`landingPage.tutorial.${step}.screenshot`)}
              width={TUTORIAL_SCREENSHOT_SIZE.width}
              height={TUTORIAL_SCREENSHOT_SIZE.height}
              loading="lazy"
              className={`${BOARD_PANEL} h-auto w-full`}
            />
          </li>
        ))}
      </ol>
    </LandingPageSection>
  );
}
