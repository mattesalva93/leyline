import type { TFunction } from 'i18next';
import type { KeyboardEvent } from 'react';
import { setAndNumberOf } from '../print-label.ts';
import type { GridTile } from './grid-tiles.ts';
import { isOnCell } from './use-grid-cell-focus.ts';

/**
 * What a screen reader says of a tile: the card, its print and its copies, and its print's
 * warning; for a line to fix, the line as written and what is wrong with it.
 */
export function tileCellLabel(gridTile: GridTile, t: TFunction): string {
  if (gridTile.kind === 'imageless') {
    return [gridTile.writtenLine.trim(), t(`tile.imageless.${gridTile.reason}`)].join(', ');
  }
  const { line, tile } = gridTile;
  return [
    line.card.name,
    setAndNumberOf(tile.print, t),
    t('tile.copies', { count: tile.quantity }),
    ...(tile.warning ? [t(`tile.printWarning.${tile.warning}`)] : []),
  ].join(', ');
}

/** What the keys do on a focused tile: Enter opens its line's panel, plus and minus change its copies. */
export function tileKeyHandler({
  onOpen,
  onQuantityStep,
}: {
  readonly onOpen: () => void;
  /** `null` for a tile with no copies of its own to change. */
  readonly onQuantityStep: ((step: 1 | -1) => void) | null;
}) {
  return (event: KeyboardEvent<HTMLElement>) => {
    if (!isOnCell(event)) return;
    const step = event.key === '+' ? 1 : event.key === '-' ? -1 : null;
    if (event.key === 'Enter') onOpen();
    else if (step !== null && onQuantityStep) onQuantityStep(step);
    else return;
    event.preventDefault();
  };
}
