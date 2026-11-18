// The browser security headers every public response carries, the page's and the API's alike.
import { PUBLIC_PATHS } from './public-paths.js';

const EXPECTED_HEADERS = {
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'permissions-policy': [
    'accelerometer=()',
    'autoplay=()',
    'camera=()',
    'display-capture=()',
    'encrypted-media=()',
    'fullscreen=()',
    'geolocation=()',
    'gyroscope=()',
    'hid=()',
    'magnetometer=()',
    'microphone=()',
    'midi=()',
    'payment=()',
    'picture-in-picture=()',
    'publickey-credentials-get=()',
    'screen-wake-lock=()',
    'serial=()',
    'usb=()',
    'xr-spatial-tracking=()',
    // The PDF is handed to the phone's share sheet (Chromium on Linux has none and warns).
    'web-share=(self)',
  ].join(', '),
  'cross-origin-opener-policy': 'same-origin',
  'content-security-policy': [
    "default-src 'self'",
    "script-src 'self'",
    // Inline styles: ADR 0016.
    "style-src 'self' 'unsafe-inline'",
    // Vite inlines a font file under its size limit into the stylesheet as a data: URL.
    "font-src 'self' data:",
    "img-src 'self' data: blob: https://cards.scryfall.io",
    "connect-src 'self' https://cards.scryfall.io",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; '),
};

/** Scryfall's images send no Cross-Origin-Resource-Policy, so COEP would block them. */
const FORBIDDEN_HEADERS = ['cross-origin-embedder-policy'];

/** @param {{ request: import('playwright').APIRequestContext, appAddress: string }} staging */
export async function securityHeaderFailures({ request, appAddress }) {
  const failures = [];
  for (const path of PUBLIC_PATHS) {
    const response = await request.get(`${appAddress}${path}`, { maxRedirects: 0 });
    const headers = response.headers();
    for (const [name, expected] of Object.entries(EXPECTED_HEADERS)) {
      const actual = headers[name];
      if (actual === undefined) failures.push(`${path}: ${name} is missing`);
      else if (actual !== expected)
        failures.push(`${path}: ${name} is "${actual}", expected "${expected}"`);
    }
    for (const name of FORBIDDEN_HEADERS) {
      if (name in headers) failures.push(`${path}: ${name} is sent, expected none`);
    }
  }
  return failures;
}
