import type { MiddlewareHandler } from 'hono';
import { clientAddressOf } from './client-address.ts';
import type { Clock } from './clock.ts';

interface RateLimitRule {
  /** Most requests one client may send within a window. */
  readonly requestsPerWindow: number;
  readonly windowSeconds: number;
}

interface Window {
  readonly endsAt: number;
  requests: number;
}

/**
 * Answers 429, with `Retry-After`, to a client that has sent more than `requestsPerWindow`
 * requests since its window opened. A client's address stays in memory only until its window
 * ends, and is never written anywhere.
 */
export function rateLimit(rule: RateLimitRule, clock: Clock): MiddlewareHandler {
  const windowMilliseconds = rule.windowSeconds * 1000;
  // Keyed by the client's address; `null` holds every request made off a socket.
  const windows = new Map<string | null, Window>();
  return async (c, next) => {
    const client = clientAddressOf(c);
    let window = windows.get(client);
    if (!window) {
      window = { endsAt: clock.now().getTime() + windowMilliseconds, requests: 0 };
      windows.set(client, window);
      clock.startTimer(windowMilliseconds, () => windows.delete(client));
    }
    window.requests++;
    if (window.requests <= rule.requestsPerWindow) return next();
    const retryAfterSeconds = Math.ceil((window.endsAt - clock.now().getTime()) / 1000);
    c.header('Retry-After', String(retryAfterSeconds));
    return c.json({ error: `Too many requests: retry in ${retryAfterSeconds} seconds.` }, 429);
  };
}
