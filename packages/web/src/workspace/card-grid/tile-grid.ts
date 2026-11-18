import type { CSSProperties } from 'react';
import { TILE_GAP_PX } from './PrintTileCard.tsx';

/** The room around the title row of a section of the card grid. */
export const GRID_SECTION_TITLE_ROW_CLASS = 'px-6 pt-3 pb-2';

/** The classes of a grid of tiles in the card grid: a section's, or the empty sections' row. */
export const TILE_GRID_CLASS = 'grid content-start gap-y-3 p-1 pr-6 pb-4 pl-6';

/** The columns of a grid of tiles, none narrower than `tileWidthPx`, stretched to fill a row. */
export function tileGridStyle(tileWidthPx: number): CSSProperties {
  return {
    columnGap: TILE_GAP_PX,
    gridTemplateColumns: `repeat(auto-fill, minmax(${tileWidthPx}px, 1fr))`,
  };
}
