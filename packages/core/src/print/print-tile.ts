import { copiesByPrint, warningOfPrint } from './allocation.ts';
import type { Print, PrintWarning, ResolvedLine } from '../types.ts';

/** The copies of one line that use the same print, shown as one element of the card grid. */
export interface PrintTile {
  readonly print: Print;
  readonly quantity: number;
  /** What to warn about the tile's own print; `null` when it is fine as it is. */
  readonly warning: PrintWarning | null;
}

/**
 * The tiles of `line`, one per distinct print its copies use: the default print's first, holding
 * the unallocated copies, then the other prints in the order of the line's allocations. Each tile
 * warns about its own print only.
 */
export function printTiles(line: ResolvedLine): PrintTile[] {
  const tiles = copiesByPrint(line).map(({ print, quantity }) => ({
    print,
    quantity,
    warning: warningOfPrint(line, print),
  }));
  const isDefault = (tile: PrintTile) => tile.print.id === line.defaultPrint?.id;
  return [...tiles.filter(isDefault), ...tiles.filter((tile) => !isDefault(tile))];
}
