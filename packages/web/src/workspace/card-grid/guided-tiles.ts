import type { GuidedStep } from '../guide/guided-steps.ts';
import type { GridSection } from './grid-sections.ts';
import { isAnsweredLineToFix, linesToFixOf } from './grid-tiles.ts';

/**
 * The tile each guided step of the grid points to, by the tile's key, in the order the grid shows
 * them: the first line to fix the server has answered for, and the first card's tile, which
 * opens a `LinePanel`.
 */
export function guidedStepsOfTiles(
  sections: readonly GridSection[],
): ReadonlyMap<string, GuidedStep> {
  const gridTiles = sections.flatMap((section) => section.gridTiles);
  const lineToFixTile = linesToFixOf(gridTiles).find(isAnsweredLineToFix);
  const linePanelTile = gridTiles.find((tile) => tile.kind === 'print');
  const steps = new Map<string, GuidedStep>();
  if (linePanelTile) steps.set(linePanelTile.key, 'openLinePanel');
  if (lineToFixTile) steps.set(lineToFixTile.key, 'fixLine');
  return steps;
}
