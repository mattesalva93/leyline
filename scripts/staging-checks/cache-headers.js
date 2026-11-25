// What the browser may keep (ADR 0025). The version file is never stored, so a page left open
// learns of a new release; the page itself is checked again on every load, the SPA fallback's
// too, so reloading brings the new release; an asset named after its content's hash is kept for
// a year, and a missing one is not kept at all.

const NO_STORE = 'no-store';
const NO_CACHE = 'no-cache';
const IMMUTABLE = 'public, max-age=31536000, immutable';

/** The bundle's entry script, whose name Vite derives from its content's hash. */
const HASHED_SCRIPT = /<script[^>]+src="(\/assets\/[^"]+\.js)"/;

/** @param {{ visitorRequest: import('playwright').APIRequestContext, appAddress: string }} staging */
export async function cacheHeaderFailures({ visitorRequest, appAddress }) {
  const failures = [];
  const get = (path) => visitorRequest.get(`${appAddress}${path}`, { maxRedirects: 0 });
  const expectCacheControl = (path, response, expected) => {
    const actual = response.headers()['cache-control'];
    if (actual !== expected)
      failures.push(
        `${path}: Cache-Control is ${actual ? `"${actual}"` : 'missing'}, expected "${expected}"`,
      );
  };

  const versionFile = await get('/version.json');
  expectCacheControl('/version.json', versionFile, NO_STORE);
  const { version } = await versionFile.json().catch(() => ({}));
  if (typeof version !== 'string') failures.push('/version.json: holds no "version"');

  const page = await get('/');
  expectCacheControl('/', page, NO_CACHE);
  // A path only the SPA fallback answers, with the page.
  expectCacheControl('/proxy', await get('/proxy'), NO_CACHE);

  const script = (await page.text()).match(HASHED_SCRIPT)?.[1];
  if (script) expectCacheControl(script, await get(script), IMMUTABLE);
  else failures.push('/: names no script under /assets/');

  const missingAsset = await get('/assets/no-such-asset.js');
  if (missingAsset.status() !== 404)
    failures.push(`/assets/no-such-asset.js: status ${missingAsset.status()}, expected 404`);
  if (missingAsset.headers()['cache-control'] !== undefined)
    failures.push('/assets/no-such-asset.js: sends Cache-Control, expected none');

  return failures;
}
