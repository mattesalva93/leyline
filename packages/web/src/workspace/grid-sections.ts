import { DECKLIST_SECTIONS, copyCount, type DecklistSectionName } from '@mtg-suite/core';
import type { WrittenCardLine } from '../use-generator.ts';
import { gridTilesOf, type GridTile } from './grid-tiles.ts';

/** A `DecklistSection` as the card grid shows it: its tiles under its title. */
export interface GridSection {
  readonly name: DecklistSectionName;
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
