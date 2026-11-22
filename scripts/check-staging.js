// Checks, on the running staging stack, the behaviour that lives in its configuration (Caddy,
// Compose, Dockerfiles, database permissions) rather than in code. Exits with an error listing
// every check that failed.
//   pnpm check:staging                       against local staging on https://localhost
//   pnpm check:staging --app https://host    against the stack running elsewhere, such as the VPS
// Needs the stack running (docker compose up -d --wait, see docs/staging.md) with the catalog
// imported, a test credential in CHECK_STAGING_USERNAME and CHECK_STAGING_PASSWORD (read from
// `.env` too), and Playwright's browser (pnpm exec playwright install chromium). It talks to the
// stack from outside, as a browser would, and reads its logs and settings through `docker`
// (DOCKER_HOST for the VPS, see docs/deploy.md), so it stays out of `pnpm check`: run it
// whenever the configuration changes and after every deploy.
import { parseArgs } from 'node:util';
import { chromium, request as playwrightRequest } from 'playwright';
import { accessLogFailures } from './staging-checks/access-log.js';
import { accessLogRotationFailures } from './staging-checks/access-log-rotation.js';
import { baseImageFailures } from './staging-checks/base-images.js';
import { containerLimitFailures } from './staging-checks/container-limits.js';
import { containerLogRotationFailures } from './staging-checks/container-log-rotation.js';
import { containerPrivilegeFailures } from './staging-checks/container-privileges.js';
import { cspInBrowserFailures } from './staging-checks/csp-in-browser.js';
import { databaseNetworkFailures } from './staging-checks/database-network.js';
import { databaseRoleFailures } from './staging-checks/database-roles.js';
import { securityHeaderFailures } from './staging-checks/security-headers.js';
import { testerAccessFailures } from './staging-checks/tester-access.js';

/** Each check resolves to the list of what it found wrong, empty when the stack passes it. */
const CHECKS = {
  'tester access': testerAccessFailures,
  'security headers': securityHeaderFailures,
  'CSP in the browser': cspInBrowserFailures,
  'access log': accessLogFailures,
  'access log rotation': accessLogRotationFailures,
  'container log rotation': containerLogRotationFailures,
  'container privileges': containerPrivilegeFailures,
  'container limits': containerLimitFailures,
  'base images': baseImageFailures,
  'database roles': databaseRoleFailures,
  'database network': databaseNetworkFailures,
};

const { values: flags } = parseArgs({ options: { app: { type: 'string' } } });
const appAddress = (flags.app ?? 'https://localhost').replace(/\/$/, '');

const { CHECK_STAGING_USERNAME: username, CHECK_STAGING_PASSWORD: password } = process.env;
if (!username || !password) {
  console.error('Set CHECK_STAGING_USERNAME and CHECK_STAGING_PASSWORD to a test credential.');
  process.exit(1);
}
const testerCredential = { username, password };

// `ignoreHTTPSErrors`: local staging signs its own certificate. `send: 'always'`: every request
// carries the credential, instead of waiting for a 401 to ask for it.
const anonymousRequest = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
const testerRequest = await playwrightRequest.newContext({
  ignoreHTTPSErrors: true,
  httpCredentials: { ...testerCredential, send: 'always' },
});
const browser = await chromium.launch();
const failures = [];
try {
  for (const [name, check] of Object.entries(CHECKS)) {
    const checkFailures = await check({
      anonymousRequest,
      testerRequest,
      browser,
      appAddress,
      testerCredential,
    }).catch((error) => [`could not run: ${error.message.split('\n')[0]}`]);
    console.log(`${name}: ${checkFailures.length === 0 ? 'ok' : `${checkFailures.length} failed`}`);
    failures.push(...checkFailures.map((failure) => `${name}: ${failure}`));
  }
} finally {
  await anonymousRequest.dispose();
  await testerRequest.dispose();
  await browser.close();
}

if (failures.length > 0) {
  console.error(`${appAddress} fails:\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
