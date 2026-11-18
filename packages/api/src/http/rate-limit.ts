import type { MiddlewareHandler } from 'hono';
import { clientAddressOf } from './client-address.ts';
import type { Clock } from './clock.ts';
import { requestFacts } from './request-facts.ts';
import type { SecurityLog } from './security-log.ts';

interface RateLimitRule {
  /** Most requests one client may send within a window. */
  readonly requestsPerWindow: number;
  readonly windowSeconds: number;
}

interface RateLimitWindow {
  readonly endsAt: number;
  requests: number;
}

/**
 * Answers 429, with `Retry-After`, to a client that has sent more than `requestsPerWindow`
 * requests since its window opened. A client's address stays in memory only until its window
 * ends, and is never written anywhere: the security log gets its network, once per window, on
 * the first refusal.
 */
export function rateLimit(
  rule: RateLimitRule,
  clock: Clock,
  securityLog: SecurityLog,
): MiddlewareHandler {
  const windowMilliseconds = rule.windowSeconds * 1000;
  // Keyed by the client's address; `null` holds every request made off a socket.
  const windows = new Map<string | null, RateLimitWindow>();
  return async (c, next) => {
    const client = clientAddressOf(c);
    let window = windows.get(client);
    // A window can end before its timer fires, when the event loop runs late.
    if (!window || window.endsAt <= clock.now().getTime()) {
      const opened = { endsAt: clock.now().getTime() + windowMilliseconds, requests: 0 };
      windows.set(client, opened);
      // A late timer must not delete the window that replaced its own.
      clock.startTimer(windowMilliseconds, () => {
        if (windows.get(client) === opened) windows.delete(client);
      });
      window = opened;
    }
    window.requests++;
    if (window.requests <= rule.requestsPerWindow) return next();
    if (window.requests === rule.requestsPerWindow + 1) {
      securityLog.record({ kind: 'rate-limited', ...requestFacts(c) });
    }
    const retryAfterSeconds = Math.ceil((window.endsAt - clock.now().getTime()) / 1000);
    c.header('Retry-After', String(retryAfterSeconds));
    return c.json({ error: `Too many requests: retry in ${retryAfterSeconds} seconds.` }, 429);
  };
}
