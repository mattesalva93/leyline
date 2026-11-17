import { describe, expect, it } from 'vitest';
import { quantityFitsTheNarrowestCard, tileTabRowsOn } from './tile-tab-geometry.ts';

describe('the rows of a tile tab', () => {
  // One row holds the quantity (two 24 px buttons and a 34 px count) centred, and on each side
  // the widest mark, the 28 px warning, with its 4 px gap: 82 + 2 × 32 = 146 px of card.
  it('keeps the flip and the warning beside the quantity on a card as wide as the row', () => {
    expect(tileTabRowsOn(146)).toBe(1);
    expect(tileTabRowsOn(160)).toBe(1);
  });

  it('stacks the flip and the warning above the quantity on a narrower card', () => {
    expect(tileTabRowsOn(145)).toBe(2);
    expect(tileTabRowsOn(90)).toBe(2);
  });
});

describe('the narrowest tile', () => {
  it('fits a two-digit quantity on its card', () => {
    expect(quantityFitsTheNarrowestCard()).toBe(true);
  });
});
