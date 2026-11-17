import { describe, expect, it } from 'vitest';
import { cardWidthOf } from './CopyPile.tsx';
import { TILE_TAB_QUANTITY_PX, tileTabRowsOn } from './tile-tab-geometry.ts';
import { TILE_WIDTH_PX } from './tile-width.ts';

describe('the rows of a tile tab', () => {
  // Card widths measured in the browser at 1280 × 800 px with the example decklist.
  it('keeps the flip and the warning beside the quantity on a card as wide as zoom 150 lays out', () => {
    expect(tileTabRowsOn(160)).toBe(1);
  });

  it('stacks the flip and the warning above the quantity on a card as narrow as zoom 100 laid out', () => {
    expect(tileTabRowsOn(110)).toBe(2);
  });
});

describe('the narrowest tile', () => {
  it('fits a two-digit quantity on its card', () => {
    expect(TILE_TAB_QUANTITY_PX).toBeLessThanOrEqual(cardWidthOf(TILE_WIDTH_PX.min));
  });
});
