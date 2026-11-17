import { COPY_PILE_FOOTPRINT_PX } from './CopyPile.tsx';
import { TILE_WIDTH_PX } from './tile-width.ts';

/** The side of the tab's square buttons (minus, plus, flip): WCAG 2.2's least pointer target. */
export const TILE_TAB_BUTTON_PX = 24;
/**
 * The least width of the quantity's count: room for a two-digit count ("12×") in the mono font,
 * so the tab keeps its width from 9 copies to 10.
 */
export const QUANTITY_COUNT_MIN_PX = 34;

/** The width of the quantity with its minus and plus, up to two digits. */
const QUANTITY_PX = 2 * TILE_TAB_BUTTON_PX + QUANTITY_COUNT_MIN_PX;

/** The width of the card of a tile `tileWidthPx` wide, which leaves its pile's room beside it. */
export function cardWidthOf(tileWidthPx: number): number {
  return tileWidthPx - COPY_PILE_FOOTPRINT_PX;
}

/** Whether the quantity, up to two digits, fits on the card of the narrowest tile the zoom gives. */
export function quantityFitsTheNarrowestCard(): boolean {
  return QUANTITY_PX <= cardWidthOf(TILE_WIDTH_PX.min);
}
