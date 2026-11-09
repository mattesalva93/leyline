/** Narrowest a print shows in the print picker grid, in CSS px; the grid stretches it to fit. */
export const PRINT_TILE_MIN_WIDTH = 104;
/** Space between tiles, in CSS px. */
export const PRINT_TILE_GAP = 8;
/** Height of the set and quality lines under a tile's image, in CSS px. */
const PRINT_TILE_CAPTION_HEIGHT = 40;
/** A Magic card is 63×88 mm. */
const CARD_ASPECT = 88 / 63;
/** The line panel is at most 40rem wide (see `.panel` in styles.css), with 1rem padding. */
const PANEL_MAX_WIDTH = 640;
const PANEL_PADDING = 16;
/** How many screens' worth of prints one request asks for. */
const SCREENS_PER_PAGE = 2;

/**
 * How many prints fill about two screens of the print picker in the current window: few on a
 * phone, more on a desktop. The server caps what it returns, whatever this asks for.
 */
export function printPageSizeForWindow(): number {
  const gridWidth = Math.min(window.innerWidth, PANEL_MAX_WIDTH) - 2 * PANEL_PADDING;
  const columns = Math.max(
    1,
    Math.floor((gridWidth + PRINT_TILE_GAP) / (PRINT_TILE_MIN_WIDTH + PRINT_TILE_GAP)),
  );
  const tileWidth = (gridWidth - (columns - 1) * PRINT_TILE_GAP) / columns;
  const rowHeight = tileWidth * CARD_ASPECT + PRINT_TILE_CAPTION_HEIGHT + PRINT_TILE_GAP;
  const rows = Math.ceil((SCREENS_PER_PAGE * window.innerHeight) / rowHeight);
  return columns * rows;
}
