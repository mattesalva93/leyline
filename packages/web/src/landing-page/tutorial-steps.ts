/** The steps of the landing page's tutorial, in the order a user takes them. */
export const TUTORIAL_STEPS = [
  'recogniseDecklist',
  'pickPrint',
  'setUpSheet',
  'downloadPdf',
] as const;

export type TutorialStep = (typeof TUTORIAL_STEPS)[number];

/** The size every tutorial screenshot is taken at, in CSS pixels: a desktop window. */
export const TUTORIAL_SCREENSHOT_SIZE = { width: 1280, height: 800 } as const;

/** The file, in `screenshots/`, that shows `step`. */
export function tutorialScreenshotFileName(step: TutorialStep): string {
  return `${step}.jpg`;
}
