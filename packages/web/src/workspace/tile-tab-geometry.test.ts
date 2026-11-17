import { describe, expect, it } from 'vitest';
import { quantityFitsTheNarrowestCard } from './tile-tab-geometry.ts';

describe('the narrowest tile', () => {
  it('fits a two-digit quantity on its card', () => {
    expect(quantityFitsTheNarrowestCard()).toBe(true);
  });
});
