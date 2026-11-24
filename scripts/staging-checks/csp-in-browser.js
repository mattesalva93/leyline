// The Content-Security-Policy as the browser applies it: the user's whole journey, from the
// decklist to the downloaded PDF, runs without the browser blocking anything the app loads.
// It listens in the page only: the app starts no worker of its own.
import italian from '../../packages/web/src/locales/it.json' with { type: 'json' };

/** A card with many prints, so the print picker has one to pick that holds no copy yet. */
const CARD_NAME = 'Lightning Bolt';
const DECKLIST_LINE = `4 ${CARD_NAME}`;
/** Wide enough that every workspace step is on screen at once, with no step bar. */
const DESKTOP_VIEWPORT = { width: 1280, height: 800 };
/** Fetching every image and composing the pages takes a while on a cold cache. */
const PDF_TIMEOUT_MS = 120_000;

/** The name of the function the page calls to hand a violation over to this script. */
const REPORT_VIOLATION_FUNCTION = 'reportCspViolation';

// Runs in the page, before any of the app's own scripts: what runs there is kept as text, since
// here, in Node, `document` does not exist.
const LISTEN_FOR_VIOLATIONS = `document.addEventListener('securitypolicyviolation', (event) =>
  window.${REPORT_VIOLATION_FUNCTION}({
    directive: event.effectiveDirective,
    resource: event.blockedURI,
  }),
);`;

/**
 * The text of an interface label up to its first placeholder, to match every label it makes. Its
 * markup tags are left out: they style the text, the accessible name holds none.
 */
function labelStart(template) {
  const text = template.replace(/<\/?[a-z]+>/gi, '');
  return new RegExp(`^${RegExp.escape(text.split('{{')[0])}`);
}

/** Switches the guide off, pastes the decklist, gives a copy to a print that had none, then downloads the sheet's PDF. */
async function walkTheWholeJourney(page, appAddress) {
  await page.goto(`${appAddress}/proxy`);
  // A first visit starts the guide, whose spotlight dims every control but the one it points to.
  await page.getByRole('button', { name: labelStart(italian.shell.guideMenu) }).click();
  await page.getByRole('menuitemcheckbox', { name: italian.shell.showGuidedSteps }).click();
  // The menu stays open on a ticked item, hiding the page from the accessibility tree.
  await page.keyboard.press('Escape');
  await page.getByLabel('Decklist').fill(`${DECKLIST_LINE}\n`);
  await page
    .getByRole('button', { name: italian.tile.open.replace('{{name}}', CARD_NAME) })
    .first()
    .click();
  const copiesOfPrintWithNone = await page
    .getByRole('group', { name: labelStart(italian.printPicker.copiesOf) })
    .filter({ has: page.getByRole('status').filter({ hasText: /^0$/ }) })
    .first()
    .getAttribute('aria-label');
  // Held by name: once it has a copy, the first print with none is another one.
  const printWithNoCopy = page.getByRole('group', { name: copiesOfPrintWithNone, exact: true });
  await printWithNoCopy
    .getByRole('button', { name: labelStart(italian.printPicker.increase) })
    .click();
  await printWithNoCopy.getByRole('status').filter({ hasText: /^1$/ }).waitFor();
  await page.getByRole('button', { name: italian.workspace.goToSheet }).click();
  const downloadStarts = page.waitForEvent('download', { timeout: PDF_TIMEOUT_MS });
  await page.getByRole('button', { name: italian.pdf.download }).click();
  const downloadError = await (await downloadStarts).failure();
  if (downloadError) throw new Error(`the PDF download failed: ${downloadError}`);
  // What the sheet still loads after the download can be blocked too.
  await page.waitForLoadState('networkidle');
}

/**
 * @param {{
 *   browser: import('playwright').Browser,
 *   appAddress: string,
 *   testerCredential: { username: string, password: string },
 * }} staging
 */
export async function cspInBrowserFailures({ browser, appAddress, testerCredential }) {
  // `ignoreHTTPSErrors`: local staging signs its own certificate.
  const context = await browser.newContext({
    viewport: DESKTOP_VIEWPORT,
    ignoreHTTPSErrors: true,
    acceptDownloads: true,
    httpCredentials: testerCredential,
  });
  const failures = [];
  try {
    await context.exposeFunction(REPORT_VIOLATION_FUNCTION, ({ directive, resource }) =>
      failures.push(`${directive} blocks ${resource}`),
    );
    await context.addInitScript(LISTEN_FOR_VIOLATIONS);
    await walkTheWholeJourney(await context.newPage(), appAddress);
  } finally {
    await context.close();
  }
  return failures;
}
