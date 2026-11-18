import { describe, expect, it } from 'vitest';
import { printPageSize } from './print-picker-geometry.ts';

describe('the prints one request asks for', () => {
  it('fills two screens of as many columns as fit, on a grid that fills its width', () => {
    // 300 px take two 104 px tiles: rows of 146 px wide tiles, 300 px high, five rows to 1280 px.
    expect(printPageSize(300, 640, 'auto-fill')).toBe(10);
  });

  it('fills two screens of the columns a grid of fixed columns has, narrower than they fit', () => {
    // Three tiles in 300 px: rows of about 95 px wide tiles, 228 px high, six rows to 1280 px.
    expect(printPageSize(300, 640, 3)).toBe(18);
  });
});
