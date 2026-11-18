import type { LineDestination } from '@mtg-suite/core';
import type { Generator } from '../generator/use-generator.ts';
import type { GridSection } from './card-grid/grid-sections.ts';
import type { GridTile, ImagelessGridTile, TileSelection } from './card-grid/grid-tiles.ts';

/** What the centre of the workspace shows: the card grid, or the sheet as it will print. */
export const CENTRE_VIEWS = ['cards', 'sheet'] as const;
export type CentreView = (typeof CENTRE_VIEWS)[number];

/** The view named `name`, or null for a name that is no view. */
export function centreViewNamed(name: string): CentreView | null {
  return CENTRE_VIEWS.find((view) => view === name) ?? null;
}

/**
 * Where the user is in the workspace: on a phone, the step on screen; on a wide screen, where
 * every zone is in sight, only the view of the centre follows it.
 */
export type WorkspaceStep = 'list' | CentreView;

/** What the centre of a wide screen shows at `step`: the decklist step has the cards beside it. */
export function centreViewAt(step: WorkspaceStep): CentreView {
  return step === 'sheet' ? 'sheet' : 'cards';
}

/** The state both layouts of the workspace show, each in its own arrangement of the zones. */
export interface WorkspaceState {
  readonly generator: Generator;
  readonly step: WorkspaceStep;
  readonly goToStep: (step: WorkspaceStep) => void;
  readonly gridSections: readonly GridSection[];
  /** Every tile of the grid, in the order of the decklist text whatever its section. */
  readonly gridTiles: readonly GridTile[];
  readonly selection: TileSelection | null;
  readonly selectTile: (selection: TileSelection | null) => void;
  /** Moves the selection to another tile of its line without counting as a press of a tile. */
  readonly moveSelection: (selection: TileSelection) => void;
  /** How many times a tile has been selected, the one already selected again included. */
  readonly tileSelectionCount: number;
  /** Moves the line in the decklist text; a selected tile of it stays selected. */
  readonly moveLine: (writtenIndex: number, destination: LineDestination) => void;
  /** Whether the mouse can drag tiles to reorder the decklist: not where touch is the main input. */
  readonly tilesAreDraggable: boolean;
  readonly linesToFix: readonly ImagelessGridTile[];
  /** Selects the first line to fix, in the card grid: a phone goes to the "cards" step. */
  readonly selectFirstLineToFix: () => void;
  /** Whether to warn that a PNG sheet makes a PDF heavy enough to strain a phone. */
  readonly warnAboutPngWeight: boolean;
}
