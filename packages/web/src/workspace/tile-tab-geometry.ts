import type { CSSProperties } from 'react';
import { COPY_PILE_FOOTPRINT_PX } from './CopyPile.tsx';
import { TILE_WIDTH_PX } from './tile-width.ts';

/** The side of the tab's square buttons (minus, plus, flip): WCAG 2.2's least pointer target. */
export const TILE_TAB_BUTTON_PX = 24;
/** The space between the quantity and the flip or the warning beside or above it. */
export const TILE_TAB_GAP_PX = 4;
/**
 * The least width of the quantity's count: room for a two-digit count ("12×") in the mono font,
 * so the tab keeps its width from 9 copies to 10.
 */
export const QUANTITY_COUNT_MIN_PX = 34;
/** The width of the mark of a print's warning, the widest thing beside the quantity. */
export const WARNING_MARK_PX = 28;

/** The width of the quantity with its minus and plus, up to two digits. */
const QUANTITY_PX = 2 * TILE_TAB_BUTTON_PX + QUANTITY_COUNT_MIN_PX;
/** The width of a card whose tab holds the centred quantity with a mark on each side. */
const ONE_ROW_CARD_PX = QUANTITY_PX + 2 * (WARNING_MARK_PX + TILE_TAB_GAP_PX);

/** The height of one row of the tab, which an imageless tile leaves empty too, in CSS px. */
const TAB_ROW_PX = 28;

export type TileTabRows = 1 | 2;

/**
 * How many rows the tab of a tile whose card is `cardWidthPx` wide takes: one with the flip and
 * the warning beside the quantity, two with them above it when they don't fit beside.
 */
export function tileTabRowsOn(cardWidthPx: number): TileTabRows {
  return cardWidthPx >= ONE_ROW_CARD_PX ? 1 : 2;
}

/** The height of a tab of `rows`, in CSS px: the row of the flip and the warning sits on the quantity's. */
function tileTabHeightPx(rows: TileTabRows): number {
  return rows === 1 ? TAB_ROW_PX : TAB_ROW_PX + TILE_TAB_BUTTON_PX;
}

const TAB_HEIGHT_PROPERTY = '--tile-tab-height';

/**
 * The height of the tab of every tile of a grid, as it sets it with `tileTabHeightStyle`, so the
 * cards of a row line up whether their tile has a tab or not. One row outside such a grid.
 */
export const TILE_TAB_HEIGHT = `var(${TAB_HEIGHT_PROPERTY}, ${tileTabHeightPx(1)}px)`;

/** What a grid of tiles whose tabs take `rows` sets for `TILE_TAB_HEIGHT`. */
export function tileTabHeightStyle(rows: TileTabRows): CSSProperties {
  return { [TAB_HEIGHT_PROPERTY]: `${tileTabHeightPx(rows)}px` } as CSSProperties;
}

/** The width of the card of a tile `tileWidthPx` wide, which leaves its pile's room beside it. */
export function cardWidthOf(tileWidthPx: number): number {
  return tileWidthPx - COPY_PILE_FOOTPRINT_PX;
}

/** Whether the quantity, up to two digits, fits on the card of the narrowest tile the zoom gives. */
export function quantityFitsTheNarrowestCard(): boolean {
  return QUANTITY_PX <= cardWidthOf(TILE_WIDTH_PX.min);
}
