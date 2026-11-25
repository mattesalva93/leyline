import type { ImportCheckIn } from './import-check-in.ts';

/** Short, so that a monitor out of reach never holds up the next import. */
const PING_TIMEOUT = 10_000;

/**
 * Checks in to the Healthchecks.io check at `pingUrl`: a ping to it after an import that
 * succeeds, to its `/fail` after one that fails. Gives up on a ping once `stop` aborts.
 */
export function healthchecksCheckIn(pingUrl: string, stop?: AbortSignal): ImportCheckIn {
  return async (outcome) => {
    // A bare GET: Healthchecks.io keeps a ping's body, and the check-in is the outcome alone.
    const url = outcome === 'succeeded' ? pingUrl : `${pingUrl}/fail`;
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
