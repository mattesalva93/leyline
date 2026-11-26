import type { ErrorHandler } from 'hono';
import type { ErrorReporter } from '../error-reporting/error-reporter.ts';
import { requestFacts } from './request-facts.ts';
import type { SecurityLog } from './security-log.ts';

/**
 * Logs what failed, reports the error alone to Bugsink, and answers 500 with a body that tells a
 * client nothing about the server.
 */
export function serverErrorHandler(
  securityLog: SecurityLog,
  errorReporter: ErrorReporter,
): ErrorHandler {
  return (error, c) => {
    securityLog.record({
      kind: 'server-error',
      ...requestFacts(c),
      error: `${error.name}: ${error.message}`,
    });
    errorReporter.report(error);
    return c.json({ error: 'Internal server error.' }, 500);
  };
}
