import type { PrintWarning, ResolvedLine } from '@mtg-suite/core';
import { LinePanel } from '../LinePanel.tsx';
import type { Generator } from '../use-generator.ts';
import { isSelected, type GridTile, type TileSelection } from './grid-tiles.ts';

/** A line that has a `LinePanel`: a resolved one, with where it is written. */
export interface PanelLine {
  readonly writtenIndex: number;
  readonly line: ResolvedLine;
  /** The warning of the tile the panel was opened from: siblings can differ. */
  readonly tileWarning: PrintWarning | null;
}

/** The line of the selected tile when it has a panel; `null` for no selection or no panel. */
export function panelLineOf(
  gridTiles: readonly GridTile[],
  selection: TileSelection | null,
): PanelLine | null {
  const gridTile = gridTiles.find((tile) => isSelected(tile, selection));
  if (gridTile?.line?.status !== 'resolved') return null;
  const tileWarning = gridTile.kind === 'print' ? gridTile.tile.warning : null;
  return { writtenIndex: gridTile.writtenIndex, line: gridTile.line, tileWarning };
}

/** The `LinePanel` of `panelLine`, its changes going to the generator. */
export function SelectedLinePanel({
  generator,
  panelLine: { writtenIndex, line, tileWarning },
}: {
  readonly generator: Generator;
  readonly panelLine: PanelLine;
}) {
  return (
    <LinePanel
      // A new line starts its panel afresh: its own prints, scrolled to the top.
      key={writtenIndex}
      line={line}
      printWarning={tileWarning}
      onQuantityChange={(quantity) => generator.changeLineQuantity(writtenIndex, quantity)}
      onAllocationChoice={(allocations) => generator.chooseAllocations(writtenIndex, allocations)}
    />
  );
}
