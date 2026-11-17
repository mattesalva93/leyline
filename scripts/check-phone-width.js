// Checks, in the running app, that the workspace on a phone is never wider than the screen:
// at each phone width, with the decklist empty and with cards, in every step and with the line's
// panel open. Exits with an error naming each place where the page grew wider.
//   pnpm check:phone-width                          against the app `pnpm dev` serves
//   pnpm check:phone-width --app https://localhost  against an app running elsewhere
// Needs the app running with the catalog in PostgreSQL (pnpm db:up, pnpm import:catalog) and
// Playwright's browser (pnpm exec playwright install chromium). It finds its way by the labels of
// the Italian interface, the app's only language. jsdom measures no layout, so this
// stays out of `pnpm check`: run it whenever the top bar or a phone layout changes.
import { parseArgs } from 'node:util';
import { chromium } from 'playwright';
import italian from '../packages/web/src/locales/it.json' with { type: 'json' };

/** The narrowest common phone and a mid-sized one. */
const PHONE_WIDTHS = [360, 390];
const PHONE_HEIGHT = 800;
const ONE_LINE_DECKLIST = '4 Lightning Bolt';
const { steps: WORKSPACE_STEP_BAR, stepNames: WORKSPACE_STEP_LABELS } = italian.workspace;

const { values: flags } = parseArgs({ options: { app: { type: 'string' } } });
const appAddress = flags.app ?? 'http://127.0.0.1:5173';

// What runs in the page is kept as text: here, in Node, `document` does not exist.

/** Runs in the page: how much wider than the screen the page is, in CSS pixels. */
const OVERFLOW_PX = 'document.documentElement.scrollWidth - innerWidth';

const overflows = [];

/** Logs whether the page fits the screen, and notes it among the overflows if not. */
async function noteOverflow(page, width, situation) {
  const overflowPx = await page.evaluate(OVERFLOW_PX);
  const verdict = overflowPx > 0 ? `${overflowPx}px too wide` : 'fits';
  console.log(`${width}px, ${situation}: ${verdict}`);
  if (overflowPx > 0) overflows.push(`${width}px, ${situation}`);
}

function workspaceStepBar(page) {
  return page.getByRole('navigation', { name: WORKSPACE_STEP_BAR });
}

async function goToWorkspaceStep(page, step) {
  await workspaceStepBar(page).getByRole('button', { name: WORKSPACE_STEP_LABELS[step] }).click();
}

async function noteOverflowInEveryWorkspaceStep(page, width, decklist) {
  for (const step of Object.keys(WORKSPACE_STEP_LABELS)) {
    await goToWorkspaceStep(page, step);
    await noteOverflow(page, width, `${decklist}, step ${step}`);
  }
}

const browser = await chromium.launch();
try {
  for (const width of PHONE_WIDTHS) {
    // `ignoreHTTPSErrors`: local staging signs its own certificate.
    const context = await browser.newContext({
      viewport: { width, height: PHONE_HEIGHT },
      hasTouch: true,
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();
    await page.goto(`${appAddress}/proxy`);
    const decklist = page.getByLabel('Decklist');
    await decklist.waitFor();
    await noteOverflow(page, width, 'empty decklist, landing page');

    // The landing page gives way to the workspace once a line is recognised.
    await decklist.fill(`${ONE_LINE_DECKLIST}\n`);
    await workspaceStepBar(page).waitFor();
    await goToWorkspaceStep(page, 'cards');
    const tile = page.getByRole('button', { name: 'Modifica Lightning Bolt' }).first();
    await tile.waitFor();
    await noteOverflowInEveryWorkspaceStep(page, width, ONE_LINE_DECKLIST);

    await goToWorkspaceStep(page, 'cards');
    await tile.click();
    const linePanel = page.getByRole('dialog', { name: 'Riga selezionata' });
    await linePanel.waitFor();
    await noteOverflow(page, width, `${ONE_LINE_DECKLIST}, line panel open`);
    await page.keyboard.press('Escape');
    await linePanel.waitFor({ state: 'hidden' });

    // Emptied, the decklist stays in the workspace.
    await goToWorkspaceStep(page, 'list');
    await decklist.fill('');
    await page.getByText(/^0\scarte/).waitFor();
    await noteOverflowInEveryWorkspaceStep(page, width, 'emptied decklist');
    await context.close();
  }
} finally {
  await browser.close();
}

if (overflows.length > 0) {
  console.error(`The page is wider than the screen at:\n  ${overflows.join('\n  ')}`);
  process.exit(1);
}
