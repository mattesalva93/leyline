import type { ErrorHandler } from 'hono';
import { maskedClientAddress } from './masked-client-address.ts';
import type { SecurityLog } from './security-log.ts';

/** Logs what failed and answers 500 with a body that tells a client nothing about the server. */
export function serverError(securityLog: SecurityLog): ErrorHandler {
  return (error, c) => {
    securityLog.record({
      kind: 'server-error',
      method: c.req.method,
      path: c.req.path,
      clientNetwork: maskedClientAddress(c),
      error: `${error.name}: ${error.message}`,
    });
    return c.json({ error: 'Internal server error.' }, 500);
  };
}
