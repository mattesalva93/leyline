// Takes the screenshots of the landing page's tutorial from the running app, one per step, on the
// example decklist.
//   pnpm landing:screenshots                          from the app `pnpm dev` serves
//   pnpm landing:screenshots --app https://localhost  from an app running elsewhere
// Needs the app running with the catalog in PostgreSQL (pnpm db:up, pnpm import:catalog) and
// Playwright's browser (pnpm exec playwright install chromium). Run it again whenever the look
// of the workspace changes: it rewrites packages/web/src/landing-page/screenshots/.
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright';
import {
  TUTORIAL_SCREENSHOT_SIZE,
  TUTORIAL_STEPS,
  tutorialScreenshotFileName,
} from '../packages/web/src/landing-page/tutorial-steps.ts';
import { waitUntilImagesOnScreenArrived } from './wait-for-images.js';

const SCREENSHOT_DIR = fileURLToPath(
  new URL('../packages/web/src/landing-page/screenshots/', import.meta.url),
);
const CARD_IMAGES = 'https://cards.scryfall.io/**';

/** A name several cards share: the example decklist has no line to fix of its own. */
const LINE_TO_FIX = '2 Bolt';
/** The line of the example decklist split over several prints. */
const CARD_SPLIT_OVER_PRINTS = 'Lightning Bolt';
/** Sharp enough for the text of the workspace, at a fraction of a PNG's weight. */
const JPEG_QUALITY = 88;
/** How many images the PDF has fetched when its screenshot is taken. */
const IMAGES_FETCHED_IN_PDF_SCREENSHOT = 5;

const { values: flags } = parseArgs({ options: { app: { type: 'string' } } });
const appAddress = flags.app ?? 'http://127.0.0.1:5173';

// What runs in the page is kept as text: here, in Node, `document` does not exist.

/**
 * Runs in the page: resolves once the images an SVG draws, as the page preview does, are ready
 * to paint and the page has painted again. An SVG image does not tell when it has arrived, so
 * each one is decoded from a copy with the same address.
 */
const EVERY_SVG_IMAGE_PAINTED = `Promise.all(
  [...document.querySelectorAll('svg image')].map((svgImage) => {
    const copy = new Image();
    copy.src = svgImage.href.baseVal;
    return copy.decode();
  }),
).then(() => new Promise((painted) => requestAnimationFrame(() => requestAnimationFrame(painted))))`;

/** Waits until the page has fetched what it asked for and shows every card image on screen. */
async function waitUntilEverythingIsOnScreen(page) {
  await waitUntilImagesOnScreenArrived(page);
  await page.evaluate(EVERY_SVG_IMAGE_PAINTED);
}

/**
 * How to bring the workspace, as the previous step left it, to what each step's screenshot
 * shows. The first one starts from the example decklist just loaded.
 */
const HOW_TO_REACH_STEP = {
  async recogniseDecklist(page) {
    await page.getByLabel('Decklist').focus();
    await page.keyboard.press('Control+Home');
    await page.keyboard.type(`${LINE_TO_FIX}\n`);
    await page.getByText('1 riga da sistemare').waitFor();
    await waitUntilEverythingIsOnScreen(page);
  },
  async pickPrint(page) {
    // The line to fix has had its screenshot: the next ones show the example decklist alone.
    await page.keyboard.press('Control+Home');
    await page.keyboard.press('Shift+ArrowDown');
    await page.keyboard.press('Backspace');
    await page.getByText('1 riga da sistemare').waitFor({ state: 'hidden' });
    await page
      .getByRole('button', { name: `Modifica ${CARD_SPLIT_OVER_PRINTS}` })
      .first()
      .click();
    // Off the tile, which would otherwise show its card enlarged under the pointer.
    await page.mouse.move(0, 0);
    await page.getByText('Ripartizione delle copie').waitFor();
    await waitUntilEverythingIsOnScreen(page);
  },
  async setUpSheet(page) {
    await page.getByRole('tab', { name: 'Foglio' }).click();
    await page.getByText('Pagina 1 di').waitFor();
    await waitUntilEverythingIsOnScreen(page);
  },
  async downloadPdf(page) {
    // The PDF stops part-way through its images, so the screenshot always shows the same progress.
    let imagesAsked = 0;
    await page.route(CARD_IMAGES, async (route) => {
      imagesAsked += 1;
      if (imagesAsked <= IMAGES_FETCHED_IN_PDF_SCREENSHOT) await route.continue();
    });
    await page.getByRole('button', { name: 'Scarica il PDF' }).click();
    await page
      .getByText(`Scaricamento delle immagini: ${IMAGES_FETCHED_IN_PDF_SCREENSHOT} di`)
      .waitFor();
  },
};

mkdirSync(SCREENSHOT_DIR, { recursive: true });
const browser = await chromium.launch();
try {
  // `ignoreHTTPSErrors`: local staging signs its own certificate.
  const context = await browser.newContext({
    viewport: TUTORIAL_SCREENSHOT_SIZE,
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  await page.goto(`${appAddress}/proxy`);
  await page.getByRole('button', { name: 'Prova con un esempio' }).click();
  await page.getByRole('button', { name: 'Modifica Sol Ring' }).waitFor();
  for (const step of TUTORIAL_STEPS) {
    await HOW_TO_REACH_STEP[step](page);
    const fileName = tutorialScreenshotFileName(step);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}${fileName}`,
      type: 'jpeg',
      quality: JPEG_QUALITY,
    });
    console.log(`Wrote ${fileName}`);
  }
} finally {
  await browser.close();
}
