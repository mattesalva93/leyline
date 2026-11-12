import type { Generator } from '../use-generator.ts';
import type { GridTile, ImagelessGridTile, TileSelection } from './grid-tiles.ts';
import type { CentreView } from './ToolRail.tsx';

/**
 * Where the user is in the workspace: on a phone, the step on screen; on a wide screen, where
 * every zone is in sight, only the view of the centre follows it.
 */
export type WorkspaceStep = 'list' | CentreView | 'pdf';

/** What the centre of a wide screen shows at `step`: the PDF is made from the sheet view. */
export function centreViewAt(step: WorkspaceStep): CentreView {
  return step === 'sheet' || step === 'pdf' ? 'sheet' : 'cards';
}

/** The state both layouts of the workspace show, each in its own arrangement of the zones. */
export interface WorkspaceState {
  readonly generator: Generator;
  readonly step: WorkspaceStep;
  readonly goToStep: (step: WorkspaceStep) => void;
  readonly gridTiles: readonly GridTile[];
  readonly selection: TileSelection | null;
  readonly selectTile: (selection: TileSelection | null) => void;
  readonly linesToFix: readonly ImagelessGridTile[];
  /** Selects the first line to fix, in the card grid: a phone goes to the "cards" step. */
  readonly selectFirstLineToFix: () => void;
  /** Whether to warn that a PNG sheet makes a PDF heavy enough to strain a phone. */
  readonly warnAboutPngWeight: boolean;
}
