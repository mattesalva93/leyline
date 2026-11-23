import { useState } from 'react';
import { touchIsMainInput } from '../generator/pdf-delivery.ts';
import { useIsWideScreen } from './screen-size.ts';
import type { Generator } from '../generator/use-generator.ts';
import { DesktopWorkspace } from './DesktopWorkspace.tsx';
import { gridSectionsOf } from './card-grid/grid-sections.ts';
import {
  gridTilesOf,
  linesToFixOf,
  type GridTile,
  type TileSelection,
} from './card-grid/grid-tiles.ts';
import { useGuide } from './guide/use-guide.ts';
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

/** The step a workspace starts from: the cards on a wide screen, the decklist on a phone. */
function startingStepFor(isWideScreen: boolean): WorkspaceStep {
  return isWideScreen ? 'cards' : 'list';
}

/**
 * The generator's screen. A wide screen shows its zones side by side; a phone shows them as
 * steps. Both show the same state: switching from one to the other loses nothing.
 */
export function Workspace({ generator }: { readonly generator: Generator }) {
  const isWideScreen = useIsWideScreen();
  const [step, setStep] = useState(() => startingStepFor(isWideScreen));
  // A new decklist starts the workspace over from its first step, where the empty workspace shows its invite.
  const [wasDecklistUnderWay, setWasDecklistUnderWay] = useState(generator.isDecklistUnderWay);
  if (wasDecklistUnderWay !== generator.isDecklistUnderWay) {
    setWasDecklistUnderWay(generator.isDecklistUnderWay);
    if (!generator.isDecklistUnderWay) setStep(startingStepFor(isWideScreen));
  }
  const [selectionInText, setSelectionInText] = useState<SelectionInText | null>(null);
  const [tileSelectionCount, setTileSelectionCount] = useState(0);
  const [touchIsMain] = useState(touchIsMainInput);
  const guide = useGuide({ isDecklistUnderWay: generator.isDecklistUnderWay });
  const gridSections = gridSectionsOf(generator.cardLines);
  const gridTiles = gridTilesOf(generator.cardLines);
  const linesToFix = linesToFixOf(gridTiles);
  const inCurrentText = (selection: TileSelection): SelectionInText => ({
    ...selection,
    writtenLineCount: generator.writtenLineCount,
  });
  const selectTile = (selection: TileSelection | null) => {
    setSelectionInText(selection && inCurrentText(selection));
    if (selection) setTileSelectionCount((count) => count + 1);
  };
  const selection = currentSelection(selectionInText, generator.writtenLineCount, gridTiles);
  const state: WorkspaceState = {
    generator,
    guide,
    step,
    goToStep: setStep,
    gridSections,
    gridTiles,
    selection,
    selectTile,
    moveSelection: (moved) => setSelectionInText(inCurrentText(moved)),
    tileSelectionCount,
    moveLine: (writtenIndex, destination) => {
      const move = generator.moveLine(writtenIndex, destination);
      if (!selection) return;
      setSelectionInText({
        ...selection,
        writtenIndex: move.previousWrittenIndexes.indexOf(selection.writtenIndex),
        writtenLineCount: move.previousWrittenIndexes.length,
      });
    },
    tilesAreDraggable: !touchIsMain,
    linesToFix,
    selectFirstLineToFix: () => {
      const [first] = linesToFix;
      if (!first) return;
      setStep('cards');
      selectTile({ writtenIndex: first.writtenIndex, printId: null });
    },
    warnAboutPngWeight: touchIsMain,
  };
  return isWideScreen ? <DesktopWorkspace state={state} /> : <PhoneWorkspace state={state} />;
}
