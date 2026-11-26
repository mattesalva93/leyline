// Records the generator's flow in the running app as the README's GIF: the example decklist, a
// print picked for one of its lines, the sheet and its PDF.
//   pnpm web:demo                                   docs/media/flow.gif, 800 px wide at 6 frames a second
//   pnpm web:demo --gif-width 640 --fps 5           smaller, when the GIF outgrows its limit
//   pnpm web:demo --app https://localhost           from an app running elsewhere
// Fails when the GIF weighs more than MAX_GIF_BYTES, so the README stays quick to load. Needs the
// app running (pnpm dev) with the catalog in PostgreSQL, Playwright's browser
// (pnpm exec playwright install chromium) and ffmpeg (brew install ffmpeg).
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright';
import { waitUntilImagesOnScreenArrived } from './wait-for-images.js';
import italian from '../packages/web/src/locales/it.json' with { type: 'json' };

const GIF_PATH = fileURLToPath(new URL('../docs/media/flow.gif', import.meta.url));
const MAX_GIF_BYTES = 4 * 1024 * 1024;
const SCREEN = { width: 1280, height: 720 };
/** What the guide's spotlight leaves lit: the control its step asks for. */
const GUIDE_SPOTLIT = '[data-guide-spotlight]';
/** How long the GIF rests on each screen, for a reader to take it in. */
const PAUSE_MS = 1500;

const { values: flags } = parseArgs({
  options: {
    app: { type: 'string', default: 'http://127.0.0.1:5173' },
    'gif-width': { type: 'string', default: '800' },
    fps: { type: 'string', default: '6' },
  },
});
for (const flag of ['gif-width', 'fps']) {
  if (!/^[1-9]\d*$/.test(flags[flag])) throw new Error(`--${flag} is a whole number above 0`);
}

/** Matches an accessible name made from `template`, whatever its `{{name}}` is filled with. */
function nameMadeFrom(template) {
  return new RegExp(`^${RegExp.escape(template.split('{{')[0])}`);
}

/** Clicks what the flow goes through next, then rests once its images are on screen. */
async function clickThenRest(page, locator) {
  await locator.click();
  await waitUntilImagesOnScreenArrived(page);
  await page.waitForTimeout(PAUSE_MS);
}

/** The example decklist, another print for one of its lines, the sheet and the PDF it makes. */
async function playFlow(page) {
  await page.goto(`${flags.app}/proxy`);
  await page.waitForTimeout(PAUSE_MS);
  await clickThenRest(page, page.getByRole('button', { name: italian.emptyWorkspace.tryExample }));
  // The guide dims all but the tile it asks to open: the flow opens that one.
  await clickThenRest(
    page,
    page.locator(GUIDE_SPOTLIT).locator('[data-tile-image-button]').first(),
  );
  const picker = page.getByRole('region', { name: nameMadeFrom(italian.printPicker.title) });
  await clickThenRest(page, picker.locator('button[aria-pressed="false"]').first());
  await clickThenRest(page, page.getByRole('button', { name: italian.workspace.goToSheet }));
  // A wide screen downloads the PDF once it is made; a phone would offer to share it instead.
  const pdfDownloaded = page.waitForEvent('download', { timeout: 60_000 });
  await page.getByRole('button', { name: italian.pdf.download }).click();
  await pdfDownloaded;
  await page.waitForTimeout(PAUSE_MS * 2);
}

/** Records the flow as a video in `dir`; resolves to the video's path. */
async function recordFlow(dir) {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      viewport: SCREEN,
      recordVideo: { dir, size: SCREEN },
      // Local staging signs its own certificate.
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();
    await playFlow(page);
    // The video is written out only once its page closes.
    await context.close();
    return await page.video().path();
  } finally {
    await browser.close();
  }
}

/** Turns the video into a GIF with a palette made from its own colours, not a generic one. */
function writeGif(videoPath) {
  const scale = `fps=${flags.fps},scale=${flags['gif-width']}:-1:flags=lanczos`;
  execFileSync('ffmpeg', [
    '-loglevel',
    'error',
    '-y',
    '-i',
    videoPath,
    '-filter_complex',
    `[0:v]${scale},split[a][b];[a]palettegen=stats_mode=diff[palette];[b][palette]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`,
    GIF_PATH,
  ]);
}

mkdirSync(dirname(GIF_PATH), { recursive: true });
const videoDir = mkdtempSync(join(tmpdir(), 'web-demo-'));
try {
  writeGif(await recordFlow(videoDir));
} finally {
  rmSync(videoDir, { recursive: true, force: true });
}
const { size } = statSync(GIF_PATH);
const megabytes = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
if (size > MAX_GIF_BYTES) {
  console.error(
    `${GIF_PATH} weighs ${megabytes(size)}, above its ${megabytes(MAX_GIF_BYTES)} limit: run it again with a smaller --gif-width or --fps.`,
  );
  process.exit(1);
}
console.log(`Wrote ${GIF_PATH} (${megabytes(size)})`);
