import { appVersion } from '../app-version.ts';
import { silentErrorReporter, type ErrorReporter } from './error-reporter.ts';

/**
 * The api's error reporter (ADR 0027): Bugsink's, once the environment names both its DSN and
 * Caddy's internal listener, else one that reports nothing and never loads the SDK.
 */
export async function errorReporterFromEnv(env = process.env): Promise<ErrorReporter> {
  const dsn = env.BUGSINK_DSN;
  const tunnel = env.ERROR_REPORTS_URL;
  if (!dsn || !tunnel) return silentErrorReporter;
  const { sentryErrorReporter } = await import('./error-reporting-sdk.ts');
  return sentryErrorReporter({ dsn, tunnel, release: appVersion() });
}
