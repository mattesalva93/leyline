import { ERROR_REPORTS_PATH } from '../../packages/web/src/error-reporting/error-reports-path.ts';
import { PRODUCT_EVENTS_PATH } from '../../packages/web/src/product-events/product-events-path.ts';

/** One address per kind of response the public site serves, an API error among them. */
export const PUBLIC_PATHS = [
  '/',
  '/proxy',
  '/version.json',
  ERROR_REPORTS_PATH,
  PRODUCT_EVENTS_PATH,
  '/api/health',
  '/api/no-such-endpoint',
];
