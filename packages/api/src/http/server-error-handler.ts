import type { ErrorHandler } from 'hono';
import { requestFacts } from './request-facts.ts';
import type { SecurityLog } from './security-log.ts';

/** Logs what failed and answers 500 with a body that tells a client nothing about the server. */
export function serverErrorHandler(securityLog: SecurityLog): ErrorHandler {
  return (error, c) => {
    securityLog.record({
      kind: 'server-error',
      ...requestFacts(c),
      error: `${error.name}: ${error.message}`,
    });
    return c.json({ error: 'Internal server error.' }, 500);
  };
}
