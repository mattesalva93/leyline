import { CARD_MM } from '@mtg-suite/core';

/** Narrowest a print shows in the print picker grid, in CSS px; the grid stretches it to fit. */
const PRINT_TILE_MIN_WIDTH = 104;
/** Space between tiles, in CSS px. */
export const PRINT_TILE_GAP = 8;
/** Height of the set and quality lines and the copy counter under a tile's image, in CSS px. */
const PRINT_TILE_CAPTION_HEIGHT = 88;
/** How many screens' worth of prints one request asks for. */
const SCREENS_PER_PAGE = 2;

/**
 * The columns of a print picker grid: as many as tiles of `PRINT_TILE_MIN_WIDTH` fit, or a fixed
 * count the tiles shrink to.
 */
export type PrintGridColumns = 'auto-fill' | number;

/** The columns of the print picker on a phone, whatever its width. */
export const PHONE_PRINT_GRID_COLUMNS = 3;

/** The CSS `grid-template-columns` of a print picker grid of `columns`. */
export function gridTemplateColumnsOf(columns: PrintGridColumns): string {
  return columns === 'auto-fill'
    ? `repeat(auto-fill, minmax(${PRINT_TILE_MIN_WIDTH}px, 1fr))`
    : `repeat(${columns}, minmax(0, 1fr))`;
}

function columnCountOf(gridWidth: number, columns: PrintGridColumns): number {
  if (columns !== 'auto-fill') return columns;
  return Math.max(
    1,
    Math.floor((gridWidth + PRINT_TILE_GAP) / (PRINT_TILE_MIN_WIDTH + PRINT_TILE_GAP)),
  );
}

/** The width the content of `panel` gets: its own width less its padding, in CSS px. */
export function contentWidthOf(panel: HTMLElement): number {
  const style = getComputedStyle(panel);
  return panel.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
}

/**
 * How many prints fill about two screens of a print picker grid `gridWidth` px wide with
 * `gridColumns`: few on a phone, more on a desktop. The server caps what it returns, whatever this asks for.
 */
export function printPageSize(
  gridWidth: number,
  screenHeight: number,
  gridColumns: PrintGridColumns,
): number {
  const columns = columnCountOf(gridWidth, gridColumns);
  const tileWidth = (gridWidth - (columns - 1) * PRINT_TILE_GAP) / columns;
  const imageHeight = (tileWidth * CARD_MM.height) / CARD_MM.width;
  const rowHeight = imageHeight + PRINT_TILE_CAPTION_HEIGHT + PRINT_TILE_GAP;
  return columns * Math.ceil((SCREENS_PER_PAGE * screenHeight) / rowHeight);
}
