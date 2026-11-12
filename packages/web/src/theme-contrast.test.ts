import { describe, expect, it } from 'vitest';
import themeCss from './theme.css?raw';

/** WCAG 2.2 AA: 1.4.3 for text, 1.4.11 for the borders of controls. */
const TEXT_MINIMUM = 4.5;
const NON_TEXT_MINIMUM = 3;

/** Each foreground colour of the theme, with the backgrounds it is drawn on. */
const TEXT_PAIRS = [
  ['foreground', 'background'],
  ['foreground', 'panel'],
  ['foreground', 'raised'],
  ['muted-foreground', 'background'],
  ['muted-foreground', 'panel'],
  ['muted-foreground', 'raised'],
  ['accent-foreground', 'accent'],
  ['chrome-foreground', 'chrome'],
  ['warning', 'panel'],
  ['warning', 'background'],
  ['danger', 'panel'],
  ['danger', 'background'],
  ['link', 'panel'],
  ['link', 'background'],
] as const;

const NON_TEXT_PAIRS = [
  ['border', 'background'],
  ['border', 'panel'],
  ['accent', 'chrome'],
] as const;

function colourTokens(block: string): Map<string, string> {
  return new Map(
    [...block.matchAll(/--color-([\w-]+):\s*(#[0-9a-f]{6,8})\s*;/gi)].map(
      ([, name, value]) => [name as string, value as string] as const,
    ),
  );
}

function blockAfter(marker: RegExp): string {
  const start = themeCss.search(marker);
  if (start < 0) throw new Error(`No ${marker} in theme.css`);
  const open = themeCss.indexOf('{', start);
  return themeCss.slice(open, themeCss.indexOf('}', open));
}

const lightTokens = colourTokens(blockAfter(/@theme\b/));
const darkTokens = new Map([...lightTokens, ...colourTokens(blockAfter(/\.dark\s*\{/))]);

function relativeLuminance(hex: string): number {
  const [red, green, blue] = [1, 3, 5].map((offset) => {
    const channel = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(first: string, second: string): number {
  const [lighter, darker] = [relativeLuminance(first), relativeLuminance(second)].sort(
    (a, b) => b - a,
  ) as [number, number];
  return (lighter + 0.05) / (darker + 0.05);
}

describe('the theme colours', () => {
  it('computes contrast as WCAG does', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21);
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
  });

  describe.each([
    ['light', lightTokens],
    ['dark', darkTokens],
  ])('in the %s theme', (_theme, tokens) => {
    function colour(name: string): string {
      const value = tokens.get(name);
      if (!value) throw new Error(`No --color-${name} in theme.css`);
      return value;
    }

    it.each(TEXT_PAIRS)('keeps %s text on %s readable at AA', (text, surface) => {
      expect(contrastRatio(colour(text), colour(surface))).toBeGreaterThanOrEqual(TEXT_MINIMUM);
    });

    it.each(NON_TEXT_PAIRS)('keeps %s visible against %s at AA', (shape, surface) => {
      expect(contrastRatio(colour(shape), colour(surface))).toBeGreaterThanOrEqual(
        NON_TEXT_MINIMUM,
      );
    });
  });
});
