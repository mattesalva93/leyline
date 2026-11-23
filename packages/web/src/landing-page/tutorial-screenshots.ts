import { tutorialScreenshotFileName, type TutorialStep } from './tutorial-steps.ts';

// `pnpm landing:screenshots` takes them from the running app.
const SCREENSHOT_ADDRESSES = import.meta.glob<string>('./screenshots/*.jpg', {
  eager: true,
  import: 'default',
});

/** The address of the screenshot that shows `step`. */
export function tutorialScreenshotAddress(step: TutorialStep): string {
  const fileName = tutorialScreenshotFileName(step);
  const address = SCREENSHOT_ADDRESSES[`./screenshots/${fileName}`];
  if (!address) throw new Error(`No screenshot ${fileName}: run pnpm landing:screenshots`);
  return address;
}
