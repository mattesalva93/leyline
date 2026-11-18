import { printedBackFace } from '@mtg-suite/core';
import type { TFunction } from 'i18next';
import type { KeyboardEvent } from 'react';
import { setAndNumberOf } from '../card-image/print-label.ts';
import type { GridTile } from './grid-tiles.ts';
import { isOnCell, isWithinCell, type GridCellProps } from './use-grid-cell-focus.ts';

/** A tile as a cell of the card grid: what the keyboard focuses, and what a screen reader says of it. */
export type TileCellProps = GridCellProps & {
  readonly 'aria-label': string;
  readonly onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
};

/**
 * What a screen reader says of a tile: the card, its print and its copies, the face it is turned
 * to when it shows its back, and its print's warning; for a line to fix, the line as written and
 * what is wrong with it.
 */
export function tileCellLabel(gridTile: GridTile, isFlipped: boolean, t: TFunction): string {
  if (gridTile.kind === 'imageless') {
    return [gridTile.writtenLine.trim(), t(`tile.imageless.${gridTile.reason}`)].join(', ');
  }
  const { line, tile } = gridTile;
  const backFace = printedBackFace(tile.print);
  return [
    line.card.name,
    setAndNumberOf(tile.print, t),
    t('tile.copies', { count: tile.quantity }),
    ...(isFlipped && backFace ? [t('tile.showsFace', { name: backFace.name })] : []),
    ...(tile.warning ? [t(`tile.printWarning.${tile.warning}`)] : []),
  ].join(', ');
}

/**
 * What the keys do on a focused tile: Enter opens its line's panel, plus and minus change its
 * copies, F turns a double-faced card over. Plus, minus and F work as well once a click has put
 * the focus on a button of the tile.
 */
export function tileKeyHandler({
  onOpen,
  onQuantityStep,
  onFlip,
}: {
  readonly onOpen: () => void;
  /** `null` for a tile with no copies of its own to change. */
  readonly onQuantityStep: ((step: 1 | -1) => void) | null;
  /** `null` for a tile with no back face. */
  readonly onFlip: (() => void) | null;
}) {
  return (event: KeyboardEvent<HTMLElement>) => {
    // Enter on a button of the tile presses that button.
    if (event.key === 'Enter' && isOnCell(event)) onOpen();
    else if (!isWithinCell(event)) return;
    else if (event.key === '+' && onQuantityStep) onQuantityStep(1);
    else if (event.key === '-' && onQuantityStep) onQuantityStep(-1);
    else if (event.key.toLowerCase() === 'f' && onFlip) onFlip();
    else return;
    event.preventDefault();
  };
}
