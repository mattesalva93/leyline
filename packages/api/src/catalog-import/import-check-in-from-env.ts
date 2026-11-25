import type { ImportCheckIn } from './import-check-in.ts';

/** Short, so that a monitor out of reach never holds up the next import. */
const PING_TIMEOUT = 10_000;

/** The check-in while monitoring is off: it sends nothing. */
const silentImportCheckIn: ImportCheckIn = async () => {};

/**
 * The importer's check-in (ADR 0027): a ping to the Healthchecks.io check that
 * `HEALTHCHECKS_PING_URL` names, else one that sends nothing.
 */
export function importCheckInFromEnv(
  env: NodeJS.ProcessEnv = process.env,
  stop?: AbortSignal,
): ImportCheckIn {
  const pingUrl = env.HEALTHCHECKS_PING_URL;
  if (!pingUrl) return silentImportCheckIn;
  return async (outcome) => {
    // A bare GET: Healthchecks.io keeps a ping's body, and the check-in is the outcome alone.
    const url = outcome === 'succeeded' ? pingUrl : `${pingUrl.replace(/\/$/, '')}/fail`;
    const gaveUp = new AbortController();
    const timer = setTimeout(
      () => gaveUp.abort(new Error(`No answer to the check-in within ${PING_TIMEOUT} ms`)),
      PING_TIMEOUT,
    );
    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: stop ? AbortSignal.any([stop, gaveUp.signal]) : gaveUp.signal,
      });
      if (!response.ok)
        throw new Error(`Healthchecks.io answered the check-in with ${response.status}`);
    } finally {
      clearTimeout(timer);
    }
  };
}
