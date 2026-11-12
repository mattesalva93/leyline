import { copiesByPrint } from './allocation.ts';
import type { Print, ResolvedLine } from './types.ts';

/** The copies of one line that use the same print, shown as one element of the card grid. */
export interface PrintTile {
  readonly print: Print;
  readonly quantity: number;
}

/**
 * The tiles of `line`, one per distinct print its copies use: the default print's first, holding
 * the unallocated copies, then the other prints in the order of the line's allocations.
 */
export function printTiles(line: ResolvedLine): PrintTile[] {
  const tiles = copiesByPrint(line);
  const isDefault = (tile: PrintTile) => tile.print.id === line.defaultPrint?.id;
  return [...tiles.filter(isDefault), ...tiles.filter((tile) => !isDefault(tile))];
}
