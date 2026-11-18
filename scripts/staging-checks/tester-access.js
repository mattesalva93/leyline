// Only a tester's credential opens the public site: without one, or with a wrong one, the page
// and the API alike answer 401 and ask the browser for a username and password.
import { PUBLIC_PATHS } from './public-paths.js';

/** The challenge that makes a browser show its own login prompt. */
const BASIC_CHALLENGE = /^Basic\b/;

function basicAuthorization(username, password) {
  return { Authorization: `Basic ${btoa(`${username}:${password}`)}` };
}

/**
 * @param {{
 *   anonymousRequest: import('playwright').APIRequestContext,
 *   appAddress: string,
 *   testerCredential: { username: string, password: string },
 * }} staging
 */
export async function testerAccessFailures({ anonymousRequest, appAddress, testerCredential }) {
  const { username, password } = testerCredential;
  const attempts = {
    'no credential': {},
    'a wrong password': basicAuthorization(username, `${password}-wrong`),
    'an unknown username': basicAuthorization(`${username}-unknown`, password),
  };
  const failures = [];
  for (const path of PUBLIC_PATHS) {
    for (const [attempt, headers] of Object.entries(attempts)) {
      const response = await anonymousRequest.get(`${appAddress}${path}`, {
        headers,
        maxRedirects: 0,
      });
      if (response.status() !== 401)
        failures.push(`${path} with ${attempt}: status ${response.status()}, expected 401`);
      else if (!BASIC_CHALLENGE.test(response.headers()['www-authenticate'] ?? ''))
        failures.push(`${path} with ${attempt}: 401 without a Basic challenge`);
    }
  }
  return failures;
}
