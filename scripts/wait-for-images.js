// What runs in the page is kept as text: here, in Node, `document` does not exist.

/** Runs in the page: whether every image on screen has arrived (the others load lazily). */
const EVERY_IMAGE_ON_SCREEN_ARRIVED = `[...document.images].every((image) => {
  const { top, bottom, width } = image.getBoundingClientRect();
  const isOnScreen = width > 0 && bottom > 0 && top < innerHeight;
  return !isOnScreen || (image.complete && image.naturalWidth > 0);
})`;

/** Waits until the page has fetched what it asked for and shows every image on screen. */
export async function waitUntilImagesOnScreenArrived(page) {
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(EVERY_IMAGE_ON_SCREEN_ARRIVED);
}
