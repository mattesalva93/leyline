import { printTiles, type DecklistLine, type PrintTile, type ResolvedLine } from '@mtg-suite/core';
import type { WrittenCardLine } from '../use-generator.ts';

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
