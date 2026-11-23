import {
  printTiles,
  type DecklistLine,
  type LineSide,
  type PrintTile,
  type ResolvedLine,
} from '@mtg-suite/core';
import type { WrittenCardLine } from '../../generator/use-generator.ts';

/** Why a line shows an imageless tile instead of its prints. */
export type ImagelessReason = 'pending' | 'notFound' | 'ambiguous' | 'noPrint';

interface GridTileBase {
  /** Names the tile among the grid's, and stays the same while its line and print do. */
  readonly key: string;
  readonly writtenIndex: number;
}

/** A `PrintTile` as the card grid shows it, with its place among its line's sibling tiles. */
export interface PrintGridTile extends GridTileBase {
  readonly kind: 'print';
  readonly line: ResolvedLine;
  readonly tile: PrintTile;
  readonly siblingIndex: number;
  readonly siblingCount: number;
}

/** The tile standing in for a line that has no print to show yet, or none at all. */
export interface ImagelessGridTile extends GridTileBase {
  readonly kind: 'imageless';
  readonly reason: ImagelessReason;
  readonly writtenLine: string;
  /** `undefined` while the server has not resolved the line. */
  readonly line: DecklistLine | undefined;
}

export type GridTile = PrintGridTile | ImagelessGridTile;

/** Which tile is selected: its line, and the print it shows (`null` for an imageless tile). */
export interface TileSelection {
  readonly writtenIndex: number;
  readonly printId: string | null;
}

/** What names the line of an imageless tile: its card once resolved, otherwise the line as written. */
export function lineNameOf({ line, writtenLine }: ImagelessGridTile): string {
  return line?.status === 'resolved' ? line.card.name : writtenLine.trim();
}

export function isSelected(gridTile: GridTile, selection: TileSelection | null): boolean {
  if (selection?.writtenIndex !== gridTile.writtenIndex) return false;
  return gridTile.kind === 'print' ? gridTile.tile.print.id === selection.printId : true;
}

/**
 * The side of its line where a line dropped on `gridTile` lands: the side of the tile the pointer
 * is on, unless the tile has siblings on that side; then the end of its line the tile is nearer.
 * The bar stands where the line lands, never on a far row.
 */
export function landingSideOf(gridTile: GridTile, pointerSide: LineSide): LineSide {
  if (gridTile.kind === 'imageless' || gridTile.siblingCount === 1) return pointerSide;
  const { siblingIndex, siblingCount } = gridTile;
  if (siblingIndex === 0) return 'before';
  if (siblingIndex === siblingCount - 1) return 'after';
  return siblingIndex < (siblingCount - 1) / 2 ? 'before' : 'after';
}

/** The side of `gridTile` that the bar of a line landing on `side` of its line stands on, if any. */
export function dropMarkSideOf(gridTile: GridTile, side: LineSide): LineSide | null {
  if (gridTile.kind === 'imageless') return side;
  const isAtThatEnd =
    side === 'before'
      ? gridTile.siblingIndex === 0
      : gridTile.siblingIndex === gridTile.siblingCount - 1;
  return isAtThatEnd ? side : null;
}

/** Whether the server has answered for the line to fix `lineToFix`: one still pending may need no fixing. */
export function isAnsweredLineToFix(lineToFix: ImagelessGridTile): boolean {
  return lineToFix.reason !== 'pending';
}

/**
 * The lines the user has to fix before they print, in the order of the decklist text: each one
 * with an imageless tile.
 */
export function linesToFixOf(gridTiles: readonly GridTile[]): ImagelessGridTile[] {
  return gridTiles.filter((gridTile) => gridTile.kind === 'imageless');
}

/** The tiles of the card grid, in the order of the decklist text: each line's siblings together. */
export function gridTilesOf(cardLines: readonly WrittenCardLine[]): GridTile[] {
  return cardLines.flatMap(({ writtenIndex, writtenLine, line }): GridTile[] => {
    const imageless = (reason: ImagelessReason): GridTile[] => [
      { kind: 'imageless', key: `${writtenIndex}`, writtenIndex, reason, writtenLine, line },
    ];
    if (line === undefined) return imageless('pending');
    if (line.status !== 'resolved') return imageless(line.status);
    const tiles = printTiles(line);
    if (tiles.length === 0) return imageless('noPrint');
    return tiles.map((tile, siblingIndex) => ({
      kind: 'print',
      key: `${writtenIndex}:${tile.print.id}`,
      writtenIndex,
      line,
      tile,
      siblingIndex,
      siblingCount: tiles.length,
    }));
  });
}
