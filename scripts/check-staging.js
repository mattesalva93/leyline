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
// whenever the configuration changes and after every deploy. With DOCKER_HOST=ssh://..., it also
// checks the VPS itself: its SSH logins, what it lets in from outside, its updates and swap.
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
import { hostMaintenanceFailures } from './staging-checks/host-maintenance.js';
import { publicReachFailures } from './staging-checks/public-reach.js';
import { securityHeaderFailures } from './staging-checks/security-headers.js';
import { sshLoginFailures } from './staging-checks/ssh-login.js';
import { testerAccessFailures } from './staging-checks/tester-access.js';
import { openVpsConnection, vpsFromDockerHost } from './staging-checks/vps-connection.js';

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

/** The checks of the host itself, run only against the VPS (ADR 0019, scripts/vps/). */
const VPS_CHECKS = {
  'SSH login': sshLoginFailures,
  'public reach': publicReachFailures,
  'host maintenance': hostMaintenanceFailures,
};

const { values: flags } = parseArgs({ options: { app: { type: 'string' } } });
const appAddress = (flags.app ?? 'https://localhost').replace(/\/$/, '');

const { CHECK_STAGING_USERNAME: username, CHECK_STAGING_PASSWORD: password } = process.env;
if (!username || !password) {
  console.error('Set CHECK_STAGING_USERNAME and CHECK_STAGING_PASSWORD to a test credential.');
  process.exit(1);
}
const testerCredential = { username, password };

const vpsAddress = vpsFromDockerHost(process.env.DOCKER_HOST);
const vps = vpsAddress && (await openVpsConnection(vpsAddress));
// Every `docker` the checks run inherits this, and goes through the shared connection.
if (vps) process.env.DOCKER_HOST = vps.dockerHost;
else console.log('VPS checks: skipped, DOCKER_HOST is not ssh://');
const checksToRun = { ...CHECKS, ...(vps ? VPS_CHECKS : {}) };

const failures = [];
let anonymousRequest, testerRequest, browser;
try {
  // `ignoreHTTPSErrors`: local staging signs its own certificate. `send: 'always'`: every
  // request carries the credential, instead of waiting for a 401 to ask for it.
  anonymousRequest = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  testerRequest = await playwrightRequest.newContext({
    ignoreHTTPSErrors: true,
    httpCredentials: { ...testerCredential, send: 'always' },
  });
  browser = await chromium.launch();
  for (const [name, check] of Object.entries(checksToRun)) {
    const checkFailures = await check({
      anonymousRequest,
      testerRequest,
      browser,
      appAddress,
      testerCredential,
      vps,
    }).catch((error) => [`could not run: ${error.message.split('\n')[0]}`]);
    console.log(`${name}: ${checkFailures.length === 0 ? 'ok' : `${checkFailures.length} failed`}`);
    failures.push(...checkFailures.map((failure) => `${name}: ${failure}`));
  }
} finally {
  await anonymousRequest?.dispose();
  await testerRequest?.dispose();
  await browser?.close();
  await vps?.close();
}

if (failures.length > 0) {
  console.error(`${appAddress} fails:\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
