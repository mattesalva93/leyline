// The browser's error reports reach Bugsink through the site's own path, and Caddy strips on the
// way everything that names the client (ADR 0027): its address, cookies, credential and browser.
// Local staging proves the stripping against a stub of Bugsink, which answers with what it
// received: set BUGSINK_ORIGIN to STUB_ORIGIN in `.env` (docs/staging.md). Against the real
// Bugsink the check only sees that the path forwards; while BUGSINK_ORIGIN is empty, that the
// path is off.
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
const CLIENT_HEADERS = {
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
const ENVELOPE = [
  JSON.stringify({ event_id: '0123456789abcdef0123456789abcdef' }),
  JSON.stringify({ type: 'event' }),
  JSON.stringify({ message: 'pnpm check:staging' }),
].join('\n');

async function webEnvironment() {
  const web = (await inspectContainers()).find((container) => serviceOf(container) === 'web');
  if (!web) throw new Error('the stack has no web container');
  const variables = Object.fromEntries(
    web.Config.Env.map((entry) => {
      const separator = entry.indexOf('=');
      return [entry.slice(0, separator), entry.slice(separator + 1)];
    }),
  );
  const network = Object.keys(web.NetworkSettings.Networks).find((name) =>
    name.endsWith('_internet'),
  );
  return { variables, network };
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
    if (response.status() !== 502 || attempt === 20) return response;
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
 * @param {{
 *   visitorRequest: import('playwright').APIRequestContext,
 *   appAddress: string,
 *   testerCredential: { username: string, password: string } | null,
 * }} staging
 */
export async function errorReportFailures({ visitorRequest, appAddress, testerCredential }) {
  const { variables, network } = await webEnvironment();
  const origin = variables.BUGSINK_ORIGIN ?? '';
  const post = () =>
    visitorRequest.post(`${appAddress}${ERROR_REPORTS_PATH}`, {
      headers: {
        ...CLIENT_HEADERS,
        // With the guard on, the visitor's own credential is the one to strip.
        ...(testerCredential === null && { Authorization: `Basic ${btoa('tester:password')}` }),
        'Content-Type': 'application/x-sentry-envelope',
      },
      data: ENVELOPE,
      maxRedirects: 0,
    });

  if (origin === '') {
    const response = await post();
    return response.status() === 404
      ? []
      : [`${ERROR_REPORTS_PATH} answers ${response.status()} while off, expected 404`];
  }
  if (origin !== STUB_ORIGIN) {
    // Bugsink rejects the made-up envelope, but it is Bugsink that answers, not the site.
    const response = await post();
    const fromTheSite = response.status() === 404 || response.status() >= 500;
    return fromTheSite
      ? [`${ERROR_REPORTS_PATH} answers ${response.status()}, expected Bugsink's answer`]
      : [];
  }
  return withStub(network, async () => {
    const response = await postToStub(post);
    if (!response.ok()) return [`${ERROR_REPORTS_PATH} answers ${response.status()}`];
    return strippingFailures(await response.json(), variables.BUGSINK_PROJECT_ID);
  });
}
