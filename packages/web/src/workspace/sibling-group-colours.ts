import type { CSSProperties } from 'react';
import type { GridSection } from './grid-sections.ts';

/** How many `--color-sibling-*` tokens the theme holds. */
const SIBLING_PALETTE_SIZE = 4;

/**
 * The colour of each line split into sibling tiles, by its written index. The lines take the
 * theme's sibling palette in the order of the card grid, across its sections, and start it over
 * once it runs out: two consecutive groups never share a colour.
 */
export function siblingGroupColoursOf(
  sections: readonly GridSection[],
): ReadonlyMap<number, string> {
  const splitLines = sections
    .flatMap((section) => section.gridTiles)
    .filter((gridTile) => gridTile.kind === 'print' && gridTile.siblingCount > 1)
    .map((gridTile) => gridTile.writtenIndex);
  return new Map(
    [...new Set(splitLines)].map((writtenIndex, group) => [
      writtenIndex,
      `var(--color-sibling-${(group % SIBLING_PALETTE_SIZE) + 1})`,
    ]),
  );
}

/** Hands a sibling tile's colour to its ring, its links, its tab and its mark. */
export function siblingColourStyle(colour: string): CSSProperties {
  return { '--sibling-colour': colour } as CSSProperties;
}
