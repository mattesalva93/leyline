import type { MiddlewareHandler } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { requestFacts } from './request-facts.ts';
import type { SecurityLog } from './security-log.ts';

/** Largest request body read: above the longest decklist and token suggestion accepted. */
const MAX_BODY_MIB = 1;
const MAX_BODY_BYTES = MAX_BODY_MIB * 1024 * 1024;

/**
 * Refuses a body over `MAX_BODY_BYTES` with 413: on its `Content-Length` before reading a byte,
 * or, when streamed without one, as soon as the bytes read pass the limit.
 */
export function requestBodyLimit(securityLog: SecurityLog): MiddlewareHandler {
  return bodyLimit({
    maxSize: MAX_BODY_BYTES,
    onError: (c) => {
      securityLog.record({
        kind: 'body-too-large',
        ...requestFacts(c),
      });
      return c.json({ error: `The request body is over ${MAX_BODY_MIB} MiB.` }, 413);
    },
  });
}
