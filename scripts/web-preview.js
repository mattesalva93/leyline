// Takes screenshots of the running app at the screen widths asked, to look at a layout change.
//   pnpm web:preview                                        /proxy at 360, 390 and 1280 px
//   pnpm web:preview --width 360 --width 430                at the widths given
//   pnpm web:preview --line "4 Lightning Bolt" --line "1 Sol Ring" --step cards
//   pnpm web:preview --example --zoom 110 --width 1280     the example decklist at the least zoom
//   pnpm web:preview --app https://localhost                from an app running elsewhere
//   pnpm web:preview --example --guide-off --width 390      with no guided step dimming the screen
// Writes .preview/web-<width>.png. Needs the app running (pnpm dev; the staging stack on
// https://localhost serves its last image, not the working tree), with the catalog in PostgreSQL
// for decklist lines, and Playwright's browser (pnpm exec playwright install chromium).
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright';
import { waitUntilImagesOnScreenArrived } from './wait-for-images.js';
import italian from '../packages/web/src/locales/it.json' with { type: 'json' };

const PREVIEW_DIR = fileURLToPath(new URL('../.preview/', import.meta.url));
const DEFAULT_WIDTHS = ['360', '390', '1280'];
const SCREEN_HEIGHT = 800;
const {
  steps: WORKSPACE_STEP_BAR,
  stepNames: WORKSPACE_STEP_LABELS,
  tileWidth: ZOOM_SLIDER,
} = italian.workspace;

const { values: flags } = parseArgs({
  options: {
    app: { type: 'string', default: 'http://127.0.0.1:5173' },
    width: { type: 'string', multiple: true, default: DEFAULT_WIDTHS },
    line: { type: 'string', multiple: true, default: [] },
    example: { type: 'boolean', default: false },
    zoom: { type: 'string' },
    step: { type: 'string' },
    path: { type: 'string', default: '/proxy' },
    'guide-off': { type: 'boolean', default: false },
  },
});
if (flags.example && flags.line.length > 0) {
  throw new Error('--example and --line both write the decklist: pick one');
}
if (flags.step && !(flags.step in WORKSPACE_STEP_LABELS)) {
  throw new Error(`--step is one of: ${Object.keys(WORKSPACE_STEP_LABELS).join(', ')}`);
}

/** Switches the guide off as a user does: from the top bar's "Guida" menu, or the phone's menu. */
async function turnGuideOff(page) {
  const phoneMenu = page.getByRole('button', { name: italian.shell.menu });
  if (await phoneMenu.isVisible()) {
    await phoneMenu.click();
    // Pressing it closes the phone menu.
    await page.getByRole('checkbox', { name: italian.shell.showGuidedSteps }).click();
  } else {
    await page.getByRole('button', { name: new RegExp(`^${italian.shell.guide}`) }).click();
    await page.getByRole('menuitemcheckbox', { name: italian.shell.showGuidedSteps }).click();
    await page.keyboard.press('Escape');
  }
}

/**
 * Writes the decklist lines, each ended so the app recognises it, or loads the example decklist,
 * then sets the zoom and opens the step asked.
 */
async function setUpWorkspace(page) {
  if (flags.example) {
    await page.getByRole('button', { name: italian.emptyWorkspace.tryExample }).click();
  } else {
    await page.getByLabel('Decklist').fill(flags.line.map((line) => `${line}\n`).join(''));
  }
  // The lines are recognised by the api: the grid replaces the empty workspace's invite once it answers.
  await page.waitForLoadState('networkidle');
  if (flags.zoom) {
    // Only a wide screen has the zoom slider: a phone shows its tiles at the default.
    await page.getByRole('slider', { name: ZOOM_SLIDER }).fill(flags.zoom);
  }
  if (!flags.step) return;
  // A wide screen shows every step at once: only a phone has the step bar.
  const stepBar = page.getByRole('navigation', { name: WORKSPACE_STEP_BAR });
  if (await stepBar.isVisible()) {
    await stepBar.getByRole('button', { name: WORKSPACE_STEP_LABELS[flags.step] }).click();
  }
}

mkdirSync(PREVIEW_DIR, { recursive: true });
const browser = await chromium.launch();
try {
  for (const width of flags.width.map(Number)) {
    // `ignoreHTTPSErrors`: local staging signs its own certificate.
    const context = await browser.newContext({
      viewport: { width, height: SCREEN_HEIGHT },
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();
    await page.goto(`${flags.app}${flags.path}`);
    if (flags['guide-off']) await turnGuideOff(page);
    if (flags.line.length > 0 || flags.example) await setUpWorkspace(page);
    await waitUntilImagesOnScreenArrived(page);
    const path = `${PREVIEW_DIR}web-${width}.png`;
    // An image that just arrived is still fading in: the shot shows where every animation ends.
    await page.screenshot({ path, animations: 'disabled' });
    console.log(`Wrote ${path}`);
    await context.close();
  }
} finally {
  await browser.close();
}
