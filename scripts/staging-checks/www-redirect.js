// The site's `www.` name sends every visitor to the site's own address, path and query kept, so
// a link typed or shared with `www.` still lands on the alpha.
import { request } from 'node:https';

const SAMPLE_PATH = '/decklist?from=www';

/**
 * Asks the site's own host for its `www.` name, in the TLS handshake (SNI) and in the Host
 * header: on staging `www.localhost` resolves to an address Caddy does not listen on.
 * @param {string} appAddress
 * @returns {Promise<{ status: number | undefined, location: string | undefined }>}
 */
function getFromWwwName(appAddress) {
  const app = new URL(appAddress);
  const wwwHost = `www.${app.hostname}`;
  return new Promise((resolve, reject) => {
    const outgoing = request(
      {
        host: app.hostname,
        port: app.port || 443,
        path: SAMPLE_PATH,
        servername: wwwHost,
        headers: { host: app.port ? `${wwwHost}:${app.port}` : wwwHost },
        // Like the other checks: local staging signs its own certificate.
        rejectUnauthorized: false,
        timeout: 10_000,
      },
      (response) => {
        response.resume();
        resolve({ status: response.statusCode, location: response.headers.location });
      },
    );
    outgoing.on('timeout', () => outgoing.destroy(new Error(`${wwwHost} did not answer`)));
    outgoing.on('error', reject);
    outgoing.end();
  });
}

/** @param {{ appAddress: string }} staging */
export async function wwwRedirectFailures({ appAddress }) {
  const { status, location } = await getFromWwwName(appAddress);
  const expected = `${appAddress}${SAMPLE_PATH}`;
  const failures = [];
  if (status !== 301) failures.push(`www. answers ${status}, not a permanent redirect (301)`);
  if (location !== expected) failures.push(`www. redirects to ${location}, not ${expected}`);
  return failures;
}
