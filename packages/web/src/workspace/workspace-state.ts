import type { Generator } from '../use-generator.ts';
import type { TileSelection } from './CardGrid.tsx';
import type { GridTile } from './grid-tiles.ts';
import type { CentreView } from './ToolRail.tsx';

/**
 * Where the user is in the workspace: on a phone, the step on screen; on a wide screen, where the
 * decklist text is always in sight, the view of the centre (`list` shows the cards).
 */
export type WorkspaceStep = 'list' | CentreView;

/** What the centre of a wide screen shows at `step`. */
export function centreViewAt(step: WorkspaceStep): CentreView {
  return step === 'sheet' ? 'sheet' : 'cards';
}

/** The state both layouts of the workspace show, each in its own arrangement of the zones. */
export interface WorkspaceState {
  readonly generator: Generator;
  readonly step: WorkspaceStep;
  readonly goToStep: (step: WorkspaceStep) => void;
  readonly gridTiles: readonly GridTile[];
  readonly selection: TileSelection | null;
  readonly select: (selection: TileSelection | null) => void;
  /** Whether to warn that a PNG sheet makes a PDF heavy enough to strain a phone. */
  readonly warnAboutPngWeight: boolean;
}
