import {
  createStackParser,
  createTransport,
  dedupeIntegration,
  functionToStringIntegration,
  linkedErrorsIntegration,
  Scope,
} from '@sentry/core';
import { nodeStackLineParser, ServerRuntimeClient } from '@sentry/core/server';
import type { ErrorReporter } from './error-reporter.ts';

export interface ErrorReportingConfig {
  /** The Bugsink project's DSN, which the envelope names so that Bugsink takes it. */
  readonly dsn: string;
  /** Caddy's internal listener, which forwards to Bugsink: the api has no route out (ADR 0016). */
  readonly tunnel: string;
  readonly release: string;
}

/**
 * Reports each error to Bugsink with Sentry's core client alone: no tracing, no instrumentation
 * of Node's modules, no breadcrumbs, no request data. What it sends is the error and the release.
 */
export function sentryErrorReporter({ dsn, tunnel, release }: ErrorReportingConfig): ErrorReporter {
  const client = new ServerRuntimeClient({
    dsn,
    tunnel,
    release,
    platform: 'node',
    runtime: { name: 'node', version: process.version },
    integrations: [functionToStringIntegration(), linkedErrorsIntegration(), dedupeIntegration()],
    stackParser: createStackParser(nodeStackLineParser()),
    transport: (options) =>
      createTransport(options, async ({ body }) => {
        const response = await fetch(options.url, { method: 'POST', body });
        return { statusCode: response.status };
      }),
    maxBreadcrumbs: 0,
    sendClientReports: false,
  });
  client.init();
  // A scope of its own, so that nothing set on Sentry's global scopes joins the error.
  const scope = new Scope();
  scope.setClient(client);
  return {
    report(error) {
      client.captureException(error, undefined, scope);
    },
  };
}
