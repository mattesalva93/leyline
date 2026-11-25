// The public site reaches Umami only at the path that receives product events (ADR 0027): its
// dashboard and every other API of it stay behind the SSH tunnel (docs/deploy.md). The events
// reach it with no address of the client, so Umami hashes none into a session. Its Next.js server
// writes the address of the socket where a request names none, which for every event is Caddy's:
// a session made through the site must be the one Umami makes for a request Caddy's container
// sends straight, naming no address.
import { randomUUID } from 'node:crypto';
import { PRODUCT_EVENTS_PATH } from '../../packages/web/src/product-events/product-events-path.ts';
import {
  execInService,
  inspectContainers,
  inspectNetworks,
  psqlAsUmami,
  serviceOf,
} from './compose-stack.js';
import { securityHeaderFailuresOf } from './security-headers.js';

/** A browser's, since Umami drops what a bot sends. */
const BROWSER_USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';

/** A website no Umami holds: Umami itself answers that it knows none. */
const UNKNOWN_WEBSITE = '00000000-0000-4000-8000-000000000000';

/**
 * Every header Umami reads a client's address from (`src/lib/ip.ts` in Umami 3.5), each one a
 * client or a proxy can write. A session made from them would differ with each address.
 */
const ADDRESS_HEADERS = [
  'true-client-ip',
  'cf-connecting-ip',
  'fastly-client-ip',
  'x-nf-client-connection-ip',
  'do-connecting-ip',
  'x-real-ip',
  'x-appengine-user-ip',
  'x-forwarded-for',
  'x-client-ip',
  'x-cluster-client-ip',
  'x-forwarded',
];

function forgedAddressHeaders(address) {
  return {
    ...Object.fromEntries(ADDRESS_HEADERS.map((name) => [name, address])),
    forwarded: `for=${address}`,
  };
}

/** Umami's own pages and APIs, and the events path asked for anything but an event. */
const UMAMI_ONLY_REQUESTS = [
  ['GET', '/login'],
  ['GET', '/dashboard'],
  ['GET', '/websites'],
  ['GET', '/script.js'],
  ['GET', '/api/heartbeat'],
  ['GET', '/api/websites'],
  ['POST', '/api/auth/login'],
  ['POST', '/api/send'],
  ['GET', PRODUCT_EVENTS_PATH],
  ['GET', `${PRODUCT_EVENTS_PATH}/login`],
  ['POST', `${PRODUCT_EVENTS_PATH}/api/auth/login`],
];

/**
 * Umami's Next.js server names itself, its pages name Umami, and its APIs answer errors as
 * `{ error: { message, code, status } }`, a shape neither Caddy nor the api uses.
 */
function answeredByUmami(headers, body) {
  if (headers['x-powered-by'] === 'Next.js' || /umami/i.test(body)) return true;
  try {
    const { error } = JSON.parse(body);
    return typeof error?.code === 'string' && typeof error?.status === 'number';
  } catch {
    return false;
  }
}

/** Umami's networks: Caddy's requests in, the database out, and no route out of Docker. */
const UMAMI_NETWORKS = ['analytics', 'database'];

async function umamiNetworkFailures() {
  const umami = (await inspectContainers()).find((container) => serviceOf(container) === 'umami');
  if (!umami) return ['the stack has no umami container'];
  const failures = [];
  for (const { Name: name, Internal: internal } of await inspectNetworks(
    Object.keys(umami.NetworkSettings.Networks),
  )) {
    if (!UMAMI_NETWORKS.some((network) => name.endsWith(`_${network}`)))
      failures.push(`umami is on ${name}`);
    else if (!internal) failures.push(`umami is on ${name}, which is not internal`);
  }
  return failures;
}

function event(website) {
  return { type: 'event', payload: { website, url: '/', hostname: 'localhost' } };
}

/** The visitor posts an event to the public path, with `headers` of its own. */
function postEvent({ visitorRequest, appAddress }, website, headers = {}) {
  return visitorRequest.post(`${appAddress}${PRODUCT_EVENTS_PATH}`, {
    headers: { 'User-Agent': BROWSER_USER_AGENT, ...headers },
    data: event(website),
    maxRedirects: 0,
  });
}

async function eventsPathFailures(staging) {
  const response = await postEvent(staging, UNKNOWN_WEBSITE);
  const body = await response.text();
  if (response.status() !== 400 || !body.includes('Website not found'))
    return [`${PRODUCT_EVENTS_PATH} answers ${response.status()}, expected Umami's answer`];
  const headers = response.headers();
  return [
    ...securityHeaderFailuresOf(PRODUCT_EVENTS_PATH, headers),
    ...('access-control-allow-origin' in headers
      ? [`${PRODUCT_EVENTS_PATH} lets other origins read it`]
      : []),
    ...('set-cookie' in headers ? [`${PRODUCT_EVENTS_PATH} sets a cookie`] : []),
  ];
}

async function umamiOnlyFailures({ visitorRequest, appAddress }) {
  const failures = [];
  for (const [method, path] of UMAMI_ONLY_REQUESTS) {
    const response = await visitorRequest.fetch(`${appAddress}${path}`, {
      method,
      headers: { 'User-Agent': BROWSER_USER_AGENT },
      ...(method === 'POST' && { data: event(UNKNOWN_WEBSITE) }),
      maxRedirects: 0,
    });
    if (answeredByUmami(response.headers(), await response.text()))
      failures.push(`${method} ${path} reaches Umami`);
  }
  return failures;
}

/** A website that lives only while `use` runs, with whatever Umami recorded for it. */
async function withProbeWebsite(use) {
  const website = randomUUID();
  await psqlAsUmami(
    `insert into website (website_id, name) values ('${website}', 'pnpm check:staging')`,
  );
  try {
    return await use(website);
  } finally {
    await psqlAsUmami(
      ...['website_event', 'session', 'website'].map(
        (table) => `delete from ${table} where website_id = '${website}'`,
      ),
    );
  }
}

/** The session Umami makes for a request from Caddy's container that names no address. */
async function sessionWithoutAddress(website) {
  // BusyBox's wget, the one HTTP client of Caddy's image: `-U` sets the user agent.
  const stdout = await execInService(
    'web',
    ...['wget', '-q', '-O', '-', '-U', BROWSER_USER_AGENT],
    ...[
      '--header',
      'Content-Type: application/json',
      '--post-data',
      JSON.stringify(event(website)),
    ],
    'http://umami:3000/api/send',
  );
  return JSON.parse(stdout).sessionId;
}

async function addressFailures(staging) {
  return withProbeWebsite(async (website) => {
    const expected = await sessionWithoutAddress(website);
    const failures = [];
    for (const address of ['203.0.113.7', '198.51.100.9']) {
      const response = await postEvent(staging, website, {
        ...forgedAddressHeaders(address),
        Cookie: 'session=tester',
      });
      if (!response.ok()) {
        failures.push(`an event for a known website gets ${response.status()}`);
        continue;
      }
      const { sessionId } = await response.json();
      if (sessionId !== expected)
        failures.push(`Umami hashes an address into the session of a visitor claiming ${address}`);
    }
    return failures;
  });
}

/**
 * @param {{
 *   visitorRequest: import('playwright').APIRequestContext,
 *   appAddress: string,
 * }} staging
 */
export async function productEventFailures(staging) {
  return [
    ...(await umamiNetworkFailures()),
    ...(await eventsPathFailures(staging)),
    ...(await umamiOnlyFailures(staging)),
    ...(await addressFailures(staging)),
  ];
}
