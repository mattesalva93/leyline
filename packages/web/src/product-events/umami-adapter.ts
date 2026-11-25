import type { ProductEvent } from './product-event.ts';
import { PRODUCT_EVENTS_PATH } from './product-events-path.ts';

/**
 * Sends `event` to Umami's events endpoint, at the site's own path: the event's fields and the
 * website alone, with a URL that names no page and no referrer. Umami's tracker script is never
 * loaded. A send that fails is dropped: the user never sees it.
 */
export function sendToUmami(websiteId: string, { name, ...data }: ProductEvent): void {
  fetch(PRODUCT_EVENTS_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'event', payload: { website: websiteId, url: '/', name, data } }),
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    // The event still leaves when the page closes right after it.
    keepalive: true,
  }).catch(() => {});
}
