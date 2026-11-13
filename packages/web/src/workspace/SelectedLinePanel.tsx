import type { Print, PrintWarning, ResolvedLine } from '@mtg-suite/core';
import { LinePanel } from '../LinePanel.tsx';
import type { Generator } from '../use-generator.ts';
import { isSelected, type GridTile, type TileSelection } from './grid-tiles.ts';

/** A line that has a `LinePanel`: a resolved one, with where it is written. */
export interface PanelLine {
  readonly writtenIndex: number;
  readonly line: ResolvedLine;
  /** The warning of the tile the panel was opened from: siblings can differ. */
  readonly tileWarning: PrintWarning | null;
  /** The print of the tile the panel was opened from; `null` for an imageless tile. */
  readonly tilePrint: Print | null;
}

/** The line of the selected tile when it has a panel; `null` for no selection or no panel. */
export function panelLineOf(
  gridTiles: readonly GridTile[],
  selection: TileSelection | null,
): PanelLine | null {
  const gridTile = gridTiles.find((tile) => isSelected(tile, selection));
  if (gridTile?.line?.status !== 'resolved') return null;
  const tile = gridTile.kind === 'print' ? gridTile.tile : null;
  return {
    writtenIndex: gridTile.writtenIndex,
    line: gridTile.line,
    tileWarning: tile?.warning ?? null,
    tilePrint: tile?.print ?? null,
  };
}

/** The `LinePanel` of `panelLine`, its changes going to the generator. */
export function SelectedLinePanel({
  generator,
  panelLine: { writtenIndex, line, tileWarning, tilePrint },
}: {
  readonly generator: Generator;
  readonly panelLine: PanelLine;
}) {
  return (
    <LinePanel
      // A new line starts its panel afresh, on the print of its tile.
      key={writtenIndex}
      line={line}
      tilePrint={tilePrint}
      printWarning={tileWarning}
      onQuantityChange={(quantity) => generator.changeLineQuantity(writtenIndex, quantity)}
      onAllocationChoice={(allocations) => generator.chooseAllocations(writtenIndex, allocations)}
      onPrintQuantityChange={(print, quantity) =>
        generator.changeTileQuantity(writtenIndex, print, quantity)
      }
    />
  );
}
