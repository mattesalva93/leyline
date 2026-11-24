// The testers' guard is in the state `--access` names (ADR 0023). Open: the page and the API
// answer anyone, and never ask for a username and password. Closed: only a tester's credential
// opens them; without one, or with a wrong one, they answer 401 and ask the browser for one.
import { PUBLIC_PATHS } from './public-paths.js';

/** The challenge that makes a browser show its own login prompt. */
const BASIC_CHALLENGE = /^Basic\b/;

function basicAuthorization(username, password) {
  return { Authorization: `Basic ${btoa(`${username}:${password}`)}` };
}

/** What each attempt to open a public path should get, by the state of the guard. */
function expectedAnswers(testerCredential) {
  if (testerCredential === null) return { 'no credential': { headers: {}, letIn: true } };
  const { username, password } = testerCredential;
  return {
    'no credential': { headers: {}, letIn: false },
    'a wrong password': {
      headers: basicAuthorization(username, `${password}-wrong`),
      letIn: false,
    },
    'an unknown username': {
      headers: basicAuthorization(`${username}-unknown`, password),
      letIn: false,
    },
    "the check's credential": { headers: basicAuthorization(username, password), letIn: true },
  };
}

/**
 * @param {{
 *   anonymousRequest: import('playwright').APIRequestContext,
 *   appAddress: string,
 *   testerCredential: { username: string, password: string } | null,
 * }} staging
 */
export async function testerAccessFailures({ anonymousRequest, appAddress, testerCredential }) {
  const failures = [];
  for (const path of PUBLIC_PATHS) {
    for (const [attempt, { headers, letIn }] of Object.entries(expectedAnswers(testerCredential))) {
      const response = await anonymousRequest.get(`${appAddress}${path}`, {
        headers,
        maxRedirects: 0,
      });
      const challenge = response.headers()['www-authenticate'];
      if (letIn && response.status() === 401)
        failures.push(`${path} with ${attempt}: status 401, expected to be let in`);
      else if (letIn && challenge !== undefined)
        failures.push(`${path} with ${attempt}: asks for a credential ("${challenge}")`);
      else if (!letIn && response.status() !== 401)
        failures.push(`${path} with ${attempt}: status ${response.status()}, expected 401`);
      else if (!letIn && !BASIC_CHALLENGE.test(challenge ?? ''))
        failures.push(`${path} with ${attempt}: 401 without a Basic challenge`);
    }
  }
  return failures;
}
