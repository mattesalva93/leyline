import type { Print, PrintWarning, ResolvedLine } from '@mtg-suite/core';
import { LinePanel } from './LinePanel.tsx';
import { PhoneLineSettings } from './PhoneLineSettings.tsx';
import type { Generator } from '../../generator/use-generator.ts';
import { isSelected, type GridTile, type TileSelection } from '../card-grid/grid-tiles.ts';
import { RemoveLineButton } from '../line-to-fix/RemoveLineButton.tsx';

/** A line that has a `LinePanel`: a resolved one, with where it is written. */
interface PanelLine {
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

/** The settings of `panelLine`, laid out for `layout`, its changes going to the generator. */
export function SelectedLinePanel({
  layout,
  generator,
  panelLine: { writtenIndex, line, tileWarning, tilePrint },
  tileSelectionCount,
  onSelectionMove,
}: {
  /** The inspector's `LinePanel`, or the phone's layout under the header of its panel. */
  readonly layout: 'inspector' | 'phone';
  readonly generator: Generator;
  readonly panelLine: PanelLine;
  /** Grows each time the user selects a tile, the one already selected included. */
  readonly tileSelectionCount: number;
  /** Moves the selection to the tile the copies moved to, without counting as a press of a tile. */
  readonly onSelectionMove: (selection: TileSelection) => void;
}) {
  const LineSettings = layout === 'phone' ? PhoneLineSettings : LinePanel;
  const linePanel = (
    <LineSettings
      // A new line starts its panel afresh, on the print of its tile.
      key={writtenIndex}
      line={line}
      tilePrint={tilePrint}
      tileSelectionCount={tileSelectionCount}
      printWarning={tileWarning}
      onQuantityChange={(quantity) => generator.changeLineQuantity(writtenIndex, quantity)}
      onTileCopiesMove={(choice, toPrint) => {
        generator.chooseAllocations(writtenIndex, choice);
        onSelectionMove({ writtenIndex, printId: toPrint.id });
      }}
      onPrintQuantityChange={(print, quantity) =>
        generator.changeTileQuantity(writtenIndex, print, quantity)
      }
    />
  );
  // Opened from an imageless tile, the line has no print to take its copies off: it goes whole.
  if (tilePrint) return linePanel;
  return (
    <div className="flex flex-col gap-4">
      {linePanel}
      <RemoveLineButton
        lineName={line.card.name}
        className="self-start"
        onRemove={() => generator.removeLine(writtenIndex)}
      />
    </div>
  );
}
