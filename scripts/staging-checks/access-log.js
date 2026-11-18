// Caddy's access log holds no full client address, whatever a client writes in its headers.
import { randomUUID } from 'node:crypto';
import { execInService } from './compose-stack.js';
import { PUBLIC_PATHS } from './public-paths.js';
import { unmaskedClientAddresses } from './access-log-entry.js';

export const ACCESS_LOG = '/var/log/caddy/access.log';

/** Addresses from the documentation ranges, in the headers a proxy uses to name the client. */
const SPOOFED_CLIENT_HEADERS = {
  'X-Forwarded-For': '203.0.113.77, 2001:db8::77',
  'X-Real-IP': '198.51.100.77',
  Forwarded: 'for=192.0.2.77',
};

/** Caddy writes a line once the response is sent: give the file a moment to show it. */
const LOG_WAIT_MS = 5_000;
const LOG_POLL_MS = 250;

async function readAccessLog() {
  return (await execInService('web', 'cat', ACCESS_LOG)).split('\n').filter(Boolean);
}

/** Sends one request per public path, as a tester and as a stranger, each marked to find it. */
async function sendMarkedRequests({ anonymousRequest, testerRequest, appAddress }) {
  const marker = `check-staging=${randomUUID()}`;
  const requests = PUBLIC_PATHS.flatMap((path) =>
    [anonymousRequest, testerRequest].map((request) =>
      request.get(`${appAddress}${path}?${marker}`, {
        headers: SPOOFED_CLIENT_HEADERS,
        maxRedirects: 0,
      }),
    ),
  );
  await Promise.all(requests);
  return { marker, count: requests.length };
}

async function waitForMarkedLines(marker, count) {
  const deadline = Date.now() + LOG_WAIT_MS;
  for (;;) {
    const lines = await readAccessLog();
    const marked = lines.filter((line) => line.includes(marker)).length;
    if (marked >= count || Date.now() > deadline) return { lines, marked };
    await new Promise((resolve) => setTimeout(resolve, LOG_POLL_MS));
  }
}

/**
 * @param {{
 *   anonymousRequest: import('playwright').APIRequestContext,
 *   testerRequest: import('playwright').APIRequestContext,
 *   appAddress: string,
 * }} staging
 */
export async function accessLogFailures(staging) {
  const { marker, count } = await sendMarkedRequests(staging);
  const { lines, marked } = await waitForMarkedLines(marker, count);
  const failures = [];
  if (marked < count)
    failures.push(`${ACCESS_LOG} logged ${marked} of the ${count} requests just sent`);
  lines.forEach((line, index) => {
    const addresses = unmaskedClientAddresses(line);
    if (addresses.length > 0)
      failures.push(`${ACCESS_LOG} line ${index + 1} holds ${addresses.join(', ')}`);
  });
  return failures;
}
