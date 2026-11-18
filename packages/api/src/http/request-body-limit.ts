import type { MiddlewareHandler } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { maskedClientAddress } from './masked-client-address.ts';
import type { SecurityLog } from './security-log.ts';

/** Largest request body read, in bytes: above the longest decklist and token suggestion accepted. */
const MAX_BODY_BYTES = 1024 * 1024;

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
        method: c.req.method,
        path: c.req.path,
        clientNetwork: maskedClientAddress(c),
      });
      return c.json({ error: 'The request body is over 1 MiB.' }, 413);
    },
  });
}
