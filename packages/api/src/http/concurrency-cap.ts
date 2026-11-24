import type { MiddlewareHandler } from 'hono';
import { requestFacts } from './request-facts.ts';
import type { SecurityLog } from './security-log.ts';

/** A slot frees as soon as a request in flight ends, most of them within a second. */
const RETRY_AFTER_SECONDS = 1;

/**
 * Answers 503 at once, with `Retry-After`, to a request arriving while `maxInFlight` others are
 * still being served, instead of queueing it: a flood from many addresses, which no per-client
 * rate limit stops, cannot pile up work on the host. The security log gets the first refusal of
 * each stretch the API spends full, not each one.
 */
export function concurrencyCap(maxInFlight: number, securityLog: SecurityLog): MiddlewareHandler {
  let inFlight = 0;
  let isRefusalLogged = false;
  return async (c, next) => {
    if (inFlight >= maxInFlight) {
      if (!isRefusalLogged) securityLog.record({ kind: 'over-capacity', ...requestFacts(c) });
      isRefusalLogged = true;
      c.header('Retry-After', String(RETRY_AFTER_SECONDS));
      return c.json({ error: `The server is busy: retry in ${RETRY_AFTER_SECONDS} second.` }, 503);
    }
    inFlight++;
    isRefusalLogged = false;
    try {
      await next();
    } finally {
      inFlight--;
    }
  };
}
