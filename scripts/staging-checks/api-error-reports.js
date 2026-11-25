// The api's error reports reach Bugsink through Caddy's internal listener, never straight out
// (ADR 0016, ADR 0027): the api stays on the `proxy` and `database` networks alone, both
// internal, and the listener answers inside the stack only. Like `error reports`, the check proves
// that Caddy strips what names the sender against the stub of Bugsink (docs/staging.md), and
// otherwise only that the listener forwards, or that it is off.
import { connect } from 'node:net';
import { execInService, inspectContainers, inspectNetworks, serviceOf } from './compose-stack.js';
import {
  CLIENT_HEADERS,
  ENVELOPE,
  postToStub,
  serviceEnvironment,
  strippingFailures,
  STUB_ORIGIN,
  withStub,
} from './error-reports.js';

/** The networks the api may be on: Caddy's requests in, the database out. */
const API_NETWORKS = ['proxy', 'database'];

/** How long the check waits for the listener's port from outside: a firewall drops, not refuses. */
const OUTSIDE_TIMEOUT_MS = 3000;

async function apiNetworkFailures() {
  const api = (await inspectContainers()).find((container) => serviceOf(container) === 'api');
  if (!api) return ['the stack has no api container'];
  const networks = await inspectNetworks(Object.keys(api.NetworkSettings.Networks));
  const failures = [];
  for (const { Name: name, Internal: internal } of networks) {
    if (!API_NETWORKS.some((network) => name.endsWith(`_${network}`)))
      failures.push(`api is on ${name}`);
    else if (!internal) failures.push(`api is on ${name}, which is not internal`);
  }
  return failures;
}

/** Whether a TCP connection to `host:port` opens within the timeout. */
function opens(host, port) {
  return new Promise((resolve) => {
    const socket = connect({ host, port, timeout: OUTSIDE_TIMEOUT_MS });
    const settle = (opened) => {
      socket.destroy();
      resolve(opened);
    };
    socket.once('connect', () => settle(true));
    socket.once('timeout', () => settle(false));
    socket.once('error', () => settle(false));
  });
}

async function outsideReachFailures(appAddress, listener) {
  const { hostname } = new URL(appAddress);
  return (await opens(hostname, Number(listener.port)))
    ? [`${hostname}:${listener.port} answers from outside, where only the api may reach it`]
    : [];
}

// Run by `node -e` in the api's container: posts the envelope as the api's SDK does, with the
// headers a sender could add, and prints the status and the body of the answer.
function postFromApiScript(url) {
  return `fetch(${JSON.stringify(url)}, {
    method: 'POST',
    headers: ${JSON.stringify({ ...CLIENT_HEADERS, 'Content-Type': 'application/x-sentry-envelope' })},
    body: ${JSON.stringify(ENVELOPE)},
  }).then(async (response) => console.log(JSON.stringify({
    status: response.status, body: await response.text(),
  })), (error) => { console.error(error.message); process.exit(1); });`;
}

async function postFromApi(url) {
  return JSON.parse(await execInService('api', 'node', '-e', postFromApiScript(url)));
}

async function forwardingFailures() {
  const { variables: api } = await serviceEnvironment('api');
  const { variables: web, network } = await serviceEnvironment('web');
  const url = api.ERROR_REPORTS_URL;
  if (!url) return ['api has no ERROR_REPORTS_URL'];
  const origin = web.BUGSINK_PROJECT_ID ? (web.BUGSINK_ORIGIN ?? '') : '';

  if (origin === '') {
    const { status } = await postFromApi(url);
    return status === 404 ? [] : [`${url} answers ${status} while off, expected 404`];
  }
  if (origin !== STUB_ORIGIN) {
    // Bugsink rejects the made-up envelope, but it is Bugsink that answers, not Caddy.
    const { status } = await postFromApi(url);
    return status === 404 || status >= 500
      ? [`${url} answers ${status}, expected Bugsink's answer`]
      : [];
  }
  return withStub(network, async () => {
    const { status, body } = await postToStub(() => postFromApi(url));
    if (status !== 200) return [`${url} answers ${status}`];
    return strippingFailures(JSON.parse(body), web.BUGSINK_PROJECT_ID);
  });
}

/** @param {{ appAddress: string }} staging */
export async function apiErrorReportFailures({ appAddress }) {
  const { variables } = await serviceEnvironment('api');
  const listener = variables.ERROR_REPORTS_URL ? new URL(variables.ERROR_REPORTS_URL) : null;
  return [
    ...(await apiNetworkFailures()),
    ...(listener ? await outsideReachFailures(appAddress, listener) : []),
    ...(await forwardingFailures()),
  ];
}
