import {
  browserApiErrorsIntegration,
  dedupeIntegration,
  eventFiltersIntegration,
  functionToStringIntegration,
  globalHandlersIntegration,
  init,
  linkedErrorsIntegration,
} from '@sentry/browser';
import { ERROR_REPORTS_PATH } from './error-reports-path.ts';
import { minimizedErrorEvent } from './minimized-error-event.ts';

/**
 * Starts the Sentry SDK on the uncaught errors alone: no tracing, replay, session, breadcrumbs,
 * console, request or culture data, so that nothing the tester wrote leaves with an error.
 */
export function startErrorReportingSdk(dsn: string): void {
  init({
    dsn,
    release: import.meta.env.APP_VERSION,
    // The site's own origin, which the page's CSP already allows (ADR 0016).
    tunnel: ERROR_REPORTS_PATH,
    defaultIntegrations: false,
    integrations: [
      eventFiltersIntegration(),
      functionToStringIntegration(),
      browserApiErrorsIntegration(),
      globalHandlersIntegration(),
      linkedErrorsIntegration(),
      dedupeIntegration(),
    ],
    maxBreadcrumbs: 0,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    },
    // An error's message stays the one the code threw.
    enhanceFetchErrorMessages: false,
    beforeSend: minimizedErrorEvent,
  });
}
