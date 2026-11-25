import type { ProductEvent } from './product-event.ts';
import { sendToUmami } from './umami-adapter.ts';

/**
 * The one door through which app code records a product event (ADR 0027). Nothing leaves while
 * the build has no Umami website id; another tool would change only the adapter called here.
 */
export function recordProductEvent(event: ProductEvent): void {
  const websiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID;
  if (!websiteId) return;
  sendToUmami(websiteId, event);
}
