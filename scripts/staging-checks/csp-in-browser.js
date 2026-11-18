// The Content-Security-Policy as the browser applies it: the user's whole journey, from the
// decklist to the downloaded PDF, runs without the browser blocking anything the app loads.
import italian from '../../packages/web/src/locales/it.json' with { type: 'json' };

/** A decklist line whose card has more than one print, so the print picker has one to pick. */
const DECKLIST_LINE = '4 Lightning Bolt';
const CARD_NAME = 'Lightning Bolt';
/** Wide enough that every workspace step is on screen at once, with no step bar. */
const DESKTOP_VIEWPORT = { width: 1280, height: 800 };
/** Fetching every image and composing the pages takes a while on a cold cache. */
const PDF_TIMEOUT_MS = 120_000;

/** The name the page calls to hand a violation over to this script. */
const REPORT_VIOLATION = 'reportCspViolation';

// Runs in the page, before any of the app's own scripts: what runs there is kept as text, since
// here, in Node, `document` does not exist.
const LISTEN_FOR_VIOLATIONS = `document.addEventListener('securitypolicyviolation', (event) =>
  window.${REPORT_VIOLATION}({ directive: event.effectiveDirective, resource: event.blockedURI }),
);`;

/** Pastes the decklist, picks another print, opens the sheet and downloads the PDF. */
async function walkTheWholeJourney(page, appAddress) {
  await page.goto(`${appAddress}/proxy`);
  await page.getByLabel('Decklist').fill(`${DECKLIST_LINE}\n`);
  await page
    .getByRole('button', { name: `Modifica ${CARD_NAME}` })
    .first()
    .click();
  // Any print the picker offers that holds none of the copies yet.
  await page
    .getByRole('button', { name: /^Una copia in più con / })
    .first()
    .click();
  await page.getByRole('button', { name: italian.workspace.goToSheet }).click();
  const download = page.waitForEvent('download', { timeout: PDF_TIMEOUT_MS });
  await page.getByRole('button', { name: italian.pdf.download }).click();
  await download;
}

/** @param {{ browser: import('playwright').Browser, appAddress: string }} staging */
export async function cspInBrowserFailures({ browser, appAddress }) {
  // `ignoreHTTPSErrors`: local staging signs its own certificate.
  const context = await browser.newContext({
    viewport: DESKTOP_VIEWPORT,
    ignoreHTTPSErrors: true,
    acceptDownloads: true,
  });
  const failures = [];
  try {
    await context.exposeFunction(REPORT_VIOLATION, ({ directive, resource }) =>
      failures.push(`${directive} blocks ${resource}`),
    );
    await context.addInitScript(LISTEN_FOR_VIOLATIONS);
    await walkTheWholeJourney(await context.newPage(), appAddress);
  } finally {
    await context.close();
  }
  return failures;
}
