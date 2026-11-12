import { copiesByPrint } from './allocation.ts';
import type { Print, ResolvedLine } from './types.ts';

/** The copies of one line that use the same print, shown as one element of the card grid. */
export interface PrintTile {
  readonly print: Print;
  readonly quantity: number;
}

/**
 * The tiles of `line`, one per distinct print its copies use, in the order those copies print.
 * The unallocated copies belong to the default print's tile.
 */
export function printTiles(line: ResolvedLine): PrintTile[] {
  return copiesByPrint(line);
}
