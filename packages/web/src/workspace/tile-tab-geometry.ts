import type { CSSProperties } from 'react';

/** The side of the tab's square buttons (minus, plus, flip): WCAG 2.2's least pointer target. */
export const TILE_TAB_BUTTON_PX = 24;
/** The space between the quantity and the flip or the warning beside or above it. */
export const TILE_TAB_GAP_PX = 4;
/** The space a tab leaves above its top row, under the set and number of the tile above. */
const SPACE_ABOVE_TAB_PX = 4;

/** The font size of the quantity, its minus and its plus, in CSS px. */
export const QUANTITY_FONT_PX = 14;
/** The space each side of the count, between it and the minus or the plus. */
export const QUANTITY_COUNT_PADDING_PX = 4;
/** The width of a character of the mono font, in em: JetBrains Mono's advance is 600 of 1000 units. */
const MONO_CHARACTER_EM = 0.6;
/** The characters of the widest count the tab makes room for: two digits and "×". */
const WIDEST_COUNT_CHARACTERS = 3;
/** The least width of the quantity's count, so the tab keeps its width from 9 copies to 10. */
export const QUANTITY_COUNT_MIN_PX = Math.ceil(
  WIDEST_COUNT_CHARACTERS * MONO_CHARACTER_EM * QUANTITY_FONT_PX + 2 * QUANTITY_COUNT_PADDING_PX,
);
/** The width of the quantity with its minus and plus, up to two digits. */
export const TILE_TAB_QUANTITY_PX = 2 * TILE_TAB_BUTTON_PX + QUANTITY_COUNT_MIN_PX;
/** The width of the mark of a print's warning, the widest thing beside the quantity. */
export const WARNING_MARK_PX = 28;

/** The width of a card whose tab holds the centred quantity with a mark on each side. */
const ONE_ROW_CARD_PX = TILE_TAB_QUANTITY_PX + 2 * (WARNING_MARK_PX + TILE_TAB_GAP_PX);

export type TileTabRows = 1 | 2;

/**
 * How many rows the tab of a tile whose card is `cardWidthPx` wide takes: one with the flip and
 * the warning beside the quantity, two with them above it when they don't fit beside.
 */
export function tileTabRowsOn(cardWidthPx: number): TileTabRows {
  return cardWidthPx >= ONE_ROW_CARD_PX ? 1 : 2;
}

/** The height of a tab of `rows`, in CSS px: each row is a button high. */
function tileTabHeightPx(rows: TileTabRows): number {
  return SPACE_ABOVE_TAB_PX + rows * TILE_TAB_BUTTON_PX;
}

const TAB_HEIGHT_PROPERTY = '--tile-tab-height';

/**
 * The height of the tab of every tile of a grid, a CSS length the grid sets with
 * `tileTabHeightStyle`, so the cards of a row line up whether their tile has a tab or not. One
 * row outside such a grid.
 */
export const TILE_TAB_HEIGHT_CSS = `var(${TAB_HEIGHT_PROPERTY}, ${tileTabHeightPx(1)}px)`;

/** What a grid of tiles whose tabs take `rows` sets for `TILE_TAB_HEIGHT_CSS`. */
export function tileTabHeightStyle(rows: TileTabRows): CSSProperties {
  return { [TAB_HEIGHT_PROPERTY]: `${tileTabHeightPx(rows)}px` } as CSSProperties;
}
