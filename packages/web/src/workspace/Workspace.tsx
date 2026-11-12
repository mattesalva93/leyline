import { useState } from 'react';
import { touchIsMainInput } from '../pdf-delivery.ts';
import { useIsWideScreen } from '../screen-size.ts';
import { useGenerator } from '../use-generator.ts';
import type { TileSelection } from './CardGrid.tsx';
import { DesktopWorkspace } from './DesktopWorkspace.tsx';
import { gridTilesOf, type GridTile } from './grid-tiles.ts';
import { PhoneWorkspace } from './PhoneWorkspace.tsx';
import type { WorkspaceState, WorkspaceStep } from './workspace-state.ts';

/** A tile selected while the decklist text had `writtenLineCount` lines. */
interface SelectionInText extends TileSelection {
  readonly writtenLineCount: number;
}

/**
 * The selection as the grid shows it now. A line written or removed in the text moves the lines
 * after it, so the selection is let go rather than landing on another line. When its print has
 * no copies left, the line's first tile takes the selection.
 */
function currentSelection(
  selection: SelectionInText | null,
  writtenLineCount: number,
  gridTiles: readonly GridTile[],
): TileSelection | null {
  if (!selection || selection.writtenLineCount !== writtenLineCount) return null;
  const tilesOfLine = gridTiles.filter((tile) => tile.writtenIndex === selection.writtenIndex);
  const [firstTile] = tilesOfLine;
  if (!firstTile) return null;
  const printIdOf = (tile: GridTile) => (tile.kind === 'print' ? tile.tile.print.id : null);
  const printId = tilesOfLine.some((tile) => printIdOf(tile) === selection.printId)
    ? selection.printId
    : printIdOf(firstTile);
  return { writtenIndex: selection.writtenIndex, printId };
}

/**
 * The generator's screen. A wide screen shows its zones side by side; a phone shows them as
 * steps. Both show the same state: switching from one to the other loses nothing.
 */
export function Workspace() {
  const generator = useGenerator();
  const isWideScreen = useIsWideScreen();
  const [step, setStep] = useState<WorkspaceStep>(isWideScreen ? 'cards' : 'list');
  const [selectionInText, setSelectionInText] = useState<SelectionInText | null>(null);
  const [touchIsMain] = useState(touchIsMainInput);
  const gridTiles = gridTilesOf(generator.cardLines);
  const state: WorkspaceState = {
    generator,
    step,
    goToStep: setStep,
    gridTiles,
    selection: currentSelection(selectionInText, generator.writtenLineCount, gridTiles),
    selectTile: (selection) =>
      setSelectionInText(
        selection && { ...selection, writtenLineCount: generator.writtenLineCount },
      ),
    warnAboutPngWeight: touchIsMain,
  };
  return isWideScreen ? <DesktopWorkspace state={state} /> : <PhoneWorkspace state={state} />;
}
