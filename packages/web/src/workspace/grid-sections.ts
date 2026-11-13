import { DECKLIST_SECTIONS, copyCount, type DecklistSection } from '@mtg-suite/core';
import type { WrittenCardLine } from '../use-generator.ts';
import { gridTilesOf, type GridTile } from './grid-tiles.ts';

/** A `DecklistSection` as the card grid shows it: its tiles under its title. */
export interface GridSection {
  readonly name: DecklistSection;
  /** How many copies the section's lines ask for, counting the lines the server recognised. */
  readonly cardCount: number;
  /** In the order of the decklist text. */
  readonly gridTiles: readonly GridTile[];
}

/** The sections of the card grid in their fixed order, leaving out those with no tile. */
export function gridSectionsOf(cardLines: readonly WrittenCardLine[]): GridSection[] {
  return DECKLIST_SECTIONS.flatMap((name): GridSection[] => {
    const linesOfSection = cardLines.filter((cardLine) => cardLine.section === name);
    if (linesOfSection.length === 0) return [];
    return [
      {
        name,
        cardCount: copyCount(linesOfSection.flatMap((cardLine) => cardLine.line ?? [])),
        gridTiles: gridTilesOf(linesOfSection),
      },
    ];
  });
}

/** The sections the card grid shows no title for, having no card: each gets an add tile after the others. */
export function emptySectionsOf(sections: readonly GridSection[]): DecklistSection[] {
  return DECKLIST_SECTIONS.filter((name) => !sections.some((section) => section.name === name));
}

/** Names the add tile of `section` among the cells of the card grid. */
export function addTileKeyOf(section: DecklistSection): string {
  return `add:${section}`;
}

/**
 * The keys of the cells of the card grid in the order it shows them: each section's tiles and
 * its add tile, then the add tiles of the sections with no card.
 */
export function gridCellKeysOf(sections: readonly GridSection[]): string[] {
  return [
    ...sections.flatMap((section) => [
      ...section.gridTiles.map((gridTile) => gridTile.key),
      addTileKeyOf(section.name),
    ]),
    ...emptySectionsOf(sections).map(addTileKeyOf),
  ];
}
