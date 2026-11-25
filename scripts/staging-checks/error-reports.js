// The browser's error reports reach Bugsink through the site's own path, and Caddy strips on the
// way everything that names the client (ADR 0027): its address, cookies, credential and browser.
// Local staging proves the stripping against a stub of Bugsink, which answers with what it
// received: set BUGSINK_ORIGIN to STUB_ORIGIN in `.env` (docs/staging.md). Against the real
// Bugsink the check only sees that the path forwards; while BUGSINK_ORIGIN or BUGSINK_PROJECT_ID
// is empty, that the path is off.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ERROR_REPORTS_PATH } from '../../packages/web/src/error-reporting/error-reports-path.ts';
import { stackBaseImages } from '../docker/base-images.js';
import { composeModel } from '../docker/compose-model.js';
import { inspectContainers, serviceOf } from './compose-stack.js';

const execFileAsync = promisify(execFile);

const STUB_HOST = 'bugsink-stub';
const STUB_PORT = 8080;
/** The BUGSINK_ORIGIN that has the check start the stub instead of reaching Bugsink. */
const STUB_ORIGIN = `http://${STUB_HOST}:${STUB_PORT}`;

/** An address no client of the check has: one a request writes in its own headers. */
const FORGED_ADDRESS = '203.0.113.7';

/** Headers a client or a proxy can send that name the client, and each must stop at Caddy. */
export const CLIENT_HEADERS = {
  Cookie: 'session=tester',
  'X-Forwarded-For': FORGED_ADDRESS,
  'X-Real-IP': FORGED_ADDRESS,
  Forwarded: `for=${FORGED_ADDRESS}`,
  'User-Agent': 'check-staging',
};

/**
 * Headers that would tell Bugsink who sent the report, lower-cased as Node gives them. Not
 * `user-agent`: Caddy sends its own in place of the browser's, which `CLIENT_HEADERS` checks.
 */
const NAMING_HEADERS = [
  'cookie',
  'authorization',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-real-ip',
  'forwarded',
  'via',
];

// It answers every request with its method, path and headers, as JSON.
const STUB_SERVER = `require('node:http').createServer((request, response) => {
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify({ path: request.url, headers: request.headers }));
}).listen(${STUB_PORT});`;

/** A minimal envelope: its header, an item header and an event. */
export const ENVELOPE = [
  JSON.stringify({ event_id: '0123456789abcdef0123456789abcdef' }),
  JSON.stringify({ type: 'event' }),
  JSON.stringify({ message: 'pnpm check:staging' }),
].join('\n');

/** The service's environment variables, as its container sees them. */
export async function serviceVariables(service) {
  const container = (await inspectContainers()).find((each) => serviceOf(each) === service);
  if (!container) throw new Error(`the stack has no ${service} container`);
  return Object.fromEntries(
    container.Config.Env.map((entry) => {
      const separator = entry.indexOf('=');
      return [entry.slice(0, separator), entry.slice(separator + 1)];
    }),
  );
}

/** The stack's `internet` network, by which Caddy reaches Bugsink. */
async function caddyInternetNetwork() {
  const web = (await inspectContainers()).find((container) => serviceOf(container) === 'web');
  if (!web) throw new Error('the stack has no web container');
  return Object.keys(web.NetworkSettings.Networks).find((name) => name.endsWith('_internet'));
}

/** Runs the stub on the network Caddy reaches Bugsink by, for as long as `use` takes. */
async function withStub(network, use) {
  const node = (await stackBaseImages(await composeModel())).find(({ reference }) =>
    reference.startsWith('node:'),
  );
  // `--network-alias` names it as BUGSINK_ORIGIN does; `--rm` removes it once stopped.
  const { stdout } = await execFileAsync('docker', [
    ...['run', '--detach', '--rm', '--read-only', '--cap-drop', 'ALL'],
    ...['--network', network, '--network-alias', STUB_HOST],
    ...[node.reference, 'node', '-e', STUB_SERVER],
  ]);
  const container = stdout.trim();
  try {
    return await use();
  } finally {
    await execFileAsync('docker', ['stop', '--time', '0', container]);
  }
}

/** Posts the envelope until the stub answers, which takes it a moment to start listening. */
async function postToStub(post) {
  for (let attempt = 0; ; attempt += 1) {
    const response = await post();
    if (response.status !== 502 || attempt === 20) return response;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

function strippingFailures(received, projectId) {
  const failures = [];
  const expectedPath = `/api/${projectId}/envelope/`;
  if (received.path !== expectedPath)
    failures.push(`Bugsink receives ${received.path}, expected ${expectedPath}`);
  const named = NAMING_HEADERS.filter((name) => name in received.headers);
  if (named.length > 0) failures.push(`Bugsink receives ${named.join(', ')}`);
  const sentValues = Object.values(CLIENT_HEADERS);
  const leaks = Object.entries(received.headers).filter(([, value]) =>
    sentValues.some((sent) => String(value).includes(sent)),
  );
  if (leaks.length > 0)
    failures.push(`Bugsink receives what the client sent in ${leaks.map(([name]) => name)}`);
  return failures;
}

/**
 * What fails at `where`, the error reports path that `post` sends the envelope to: it must answer
 * 404 while off, leave the answer to Bugsink while on, and, against the stub, forward nothing that
 * names the sender. `post` resolves to the answer's status, and `received()` reads the stub's
 * account of what reached it.
 *
 * @param {string} where
 * @param {() => Promise<{ status: number, received: () => Promise<any> }>} post
 */
export async function forwardingFailures(where, post) {
  const web = await serviceVariables('web');
  const origin = web.BUGSINK_PROJECT_ID ? (web.BUGSINK_ORIGIN ?? '') : '';
  if (origin === '') {
    const { status } = await post();
    return status === 404 ? [] : [`${where} answers ${status} while off, expected 404`];
  }
  if (origin !== STUB_ORIGIN) {
    // Bugsink rejects the made-up envelope, but it is Bugsink that answers, not Caddy.
    const { status } = await post();
    return status === 404 || status >= 500
      ? [`${where} answers ${status}, expected Bugsink's answer`]
      : [];
  }
  return withStub(await caddyInternetNetwork(), async () => {
    const response = await postToStub(post);
    if (response.status !== 200) return [`${where} answers ${response.status}`];
    return strippingFailures(await response.received(), web.BUGSINK_PROJECT_ID);
  });
}

/**
 * @param {{
 *   visitorRequest: import('playwright').APIRequestContext,
 *   appAddress: string,
 *   testerCredential: { username: string, password: string } | null,
 * }} staging
 */
export function errorReportFailures({ visitorRequest, appAddress, testerCredential }) {
  return forwardingFailures(ERROR_REPORTS_PATH, async () => {
    const answer = await visitorRequest.post(`${appAddress}${ERROR_REPORTS_PATH}`, {
      headers: {
        ...CLIENT_HEADERS,
        // With the guard on, the visitor's own credential is the one to strip.
        ...(testerCredential === null && { Authorization: `Basic ${btoa('tester:password')}` }),
        'Content-Type': 'application/x-sentry-envelope',
      },
      data: ENVELOPE,
      maxRedirects: 0,
    });
    return { status: answer.status(), received: () => answer.json() };
  });
}
