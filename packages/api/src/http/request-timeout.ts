import type { MiddlewareHandler } from 'hono';
import type { Clock } from './clock.ts';
import { requestFacts } from './request-facts.ts';
import type { SecurityLog } from './security-log.ts';

/** Longest a request may run, reading its body included, before the API gives up on it. */
const REQUEST_TIMEOUT_SECONDS = 10;

/**
 * Answers 503 to a request still running after `REQUEST_TIMEOUT_SECONDS`. The work behind it
 * goes on until it ends by itself; ADR 0016 bounds a slow query with the API's statement timeout.
 */
export function requestTimeout(clock: Clock, securityLog: SecurityLog): MiddlewareHandler {
  return async (c, next) => {
    let cancelTimer = () => {};
    const timedOut = new Promise<'timed-out'>((settle) => {
      cancelTimer = clock.startTimer(REQUEST_TIMEOUT_SECONDS * 1000, () => settle('timed-out'));
    });
    try {
      const outcome = await Promise.race([next(), timedOut]);
      if (outcome !== 'timed-out') return;
    } finally {
      cancelTimer();
    }
    securityLog.record({
      kind: 'request-timeout',
      ...requestFacts(c),
    });
    return c.json(
      { error: `The request took longer than ${REQUEST_TIMEOUT_SECONDS} seconds.` },
      503,
    );
  };
}
