// Search engines may index the open alpha (ADR 0023): no response asks them to stay out, neither
// in a header nor in the page.
import { PUBLIC_PATHS } from './public-paths.js';

const ROBOTS_META = /<meta[^>]+name=["']?robots\b/i;

/** @param {{ visitorRequest: import('playwright').APIRequestContext, appAddress: string }} staging */
export async function searchIndexingFailures({ visitorRequest, appAddress }) {
  const failures = [];
  for (const path of PUBLIC_PATHS) {
    const response = await visitorRequest.get(`${appAddress}${path}`, { maxRedirects: 0 });
    const robotsHeader = response.headers()['x-robots-tag'];
    if (robotsHeader !== undefined) failures.push(`${path}: sends X-Robots-Tag "${robotsHeader}"`);
    if (ROBOTS_META.test(await response.text()))
      failures.push(`${path}: holds <meta name="robots">`);
  }
  return failures;
}
