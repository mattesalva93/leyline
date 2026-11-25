/** Whether this build records product events in Umami: its website id is not empty. */
export function productEventsAreOn(): boolean {
  return Boolean(import.meta.env.VITE_UMAMI_WEBSITE_ID);
}
