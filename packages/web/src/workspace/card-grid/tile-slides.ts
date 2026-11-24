import type { DecklistSection } from '@leyline/core';
import { addTileKeyOf } from './grid-sections.ts';

/** What of a grid tile names it as it slides: the card it shows. */
type SlidingTile =
  | {
      readonly kind: 'print';
      readonly key: string;
      readonly tile: { readonly print: { readonly id: string } };
    }
  | { readonly kind: 'imageless'; readonly key: string; readonly writtenLine: string };

/** What of a grid section names its tiles as they slide. */
interface SlidingSection {
  readonly name: DecklistSection;
  readonly gridTiles: readonly SlidingTile[];
}

/**
 * Names each cell of the card grid, by its key, after the card it shows rather than the place of
 * its line in the decklist, so a tile keeps its name as its line moves, into another section too:
 * the n-th tile of a print in the grid, of a line with no print the n-th written alike; an add tile
 * by its section.
 */
export function slideKeysOf(sections: readonly SlidingSection[]): ReadonlyMap<string, string> {
  const timesSeen = new Map<string, number>();
  const slideKeys = new Map<string, string>();
  for (const section of sections) {
    for (const gridTile of section.gridTiles) {
      const card =
        gridTile.kind === 'print'
          ? `print:${gridTile.tile.print.id}`
          : `line:${gridTile.writtenLine.trim()}`;
      const seen = timesSeen.get(card) ?? 0;
      timesSeen.set(card, seen + 1);
      slideKeys.set(gridTile.key, `${card}#${seen}`);
    }
    const addTileKey = addTileKeyOf(section.name);
    slideKeys.set(addTileKey, addTileKey);
  }
  return slideKeys;
}

/** Where a cell of the card grid stands on the page, named by the card it shows. */
export interface PlacedTile {
  readonly slideKey: string;
  /** In CSS px. */
  readonly left: number;
  /** In CSS px. */
  readonly top: number;
}

/** A tile that slides into its place: how far from it it starts, in CSS px. */
export interface TileSlide {
  readonly slideKey: string;
  readonly fromX: number;
  readonly fromY: number;
}

/** Whether the grid shows the same cells in the same order, given their slide keys in it. */
export function isSameOrder(before: readonly string[], after: readonly string[]): boolean {
  return (
    before.length === after.length && before.every((slideKey, index) => slideKey === after[index])
  );
}

function slideKeysIn(places: readonly PlacedTile[]): string[] {
  return places.map((place) => place.slideKey);
}

/**
 * The tiles that slide as the grid goes from `before` to `after`, from where each stood. Only a
 * change of order moves them: a grid that only reflowed, such as one that changed width, just is.
 */
export function slidesBetween(
  before: readonly PlacedTile[],
  after: readonly PlacedTile[],
): TileSlide[] {
  if (isSameOrder(slideKeysIn(before), slideKeysIn(after))) return [];
  const placeBefore = new Map(before.map((tile) => [tile.slideKey, tile]));
  return after.flatMap(({ slideKey, left, top }): TileSlide[] => {
    const was = placeBefore.get(slideKey);
    if (!was || (was.left === left && was.top === top)) return [];
    return [{ slideKey, fromX: was.left - left, fromY: was.top - top }];
  });
}
