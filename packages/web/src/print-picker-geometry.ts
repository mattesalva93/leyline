import { CARD_MM } from '@mtg-suite/core';

/** Narrowest a print shows in the print picker grid, in CSS px; the grid stretches it to fit. */
export const PRINT_TILE_MIN_WIDTH = 104;
/** Space between tiles, in CSS px. */
export const PRINT_TILE_GAP = 8;
/** Height of the set and quality lines and the copy counter under a tile's image, in CSS px. */
const PRINT_TILE_CAPTION_HEIGHT = 88;
/** How many screens' worth of prints one request asks for. */
const SCREENS_PER_PAGE = 2;

/** The width the content of `panel` gets: its own width less its padding, in CSS px. */
export function contentWidthOf(panel: HTMLElement): number {
  const style = getComputedStyle(panel);
  return panel.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
}

/**
 * How many prints fill about two screens of a print picker grid `gridWidth` px wide: few on a
 * phone, more on a desktop. The server caps what it returns, whatever this asks for.
 */
export function printPageSize(gridWidth: number, screenHeight: number): number {
  const columns = Math.max(
    1,
    Math.floor((gridWidth + PRINT_TILE_GAP) / (PRINT_TILE_MIN_WIDTH + PRINT_TILE_GAP)),
  );
  const tileWidth = (gridWidth - (columns - 1) * PRINT_TILE_GAP) / columns;
  const imageHeight = (tileWidth * CARD_MM.height) / CARD_MM.width;
  const rowHeight = imageHeight + PRINT_TILE_CAPTION_HEIGHT + PRINT_TILE_GAP;
  return columns * Math.ceil((SCREENS_PER_PAGE * screenHeight) / rowHeight);
}
