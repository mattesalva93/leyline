import type { CSSProperties } from 'react';
import type { GridTile } from './grid-tiles.ts';
import { regionPaletteIndicesOf } from './region-palette-indices.ts';

/** How many `--color-sibling-*` tokens the theme holds: `pnpm check:theme` holds the theme to it. */
const SIBLING_PALETTE_SIZE = 4;

/**
 * The colour of each line split into sibling tiles, by its written index, in a grid of
 * `columns` columns: two groups of sibling tiles side by side or one above the other never share a
 * colour while the theme's sibling palette allows it.
 */
export function siblingGroupColoursOf(
  gridTiles: readonly GridTile[],
  columns: number,
): ReadonlyMap<number, string> {
  const cells = gridTiles.map((gridTile) =>
    gridTile.kind === 'print' && gridTile.siblingCount > 1 ? gridTile.writtenIndex : null,
  );
  const paletteIndices = regionPaletteIndicesOf(cells, columns, SIBLING_PALETTE_SIZE);
  return new Map(
    [...paletteIndices].map(([writtenIndex, paletteIndex]) => [
      writtenIndex,
      // The tokens count from 1.
      `var(--color-sibling-${paletteIndex + 1})`,
    ]),
  );
}

/** Hands a sibling tile's colour to its ring, its links, its tab and its mark. */
export function siblingColourStyle(colour: string): CSSProperties {
  return { '--sibling-colour': colour } as CSSProperties;
}
