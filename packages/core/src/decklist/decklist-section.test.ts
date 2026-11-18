import { describe, expect, it } from 'vitest';
import { sectionOfEachWrittenLine, writtenLinesOf } from '../index.ts';

/** The section of each written line of `text`. */
function sectionsOf(text: string) {
  return sectionOfEachWrittenLine(writtenLinesOf(text));
}

describe('sectionOfEachWrittenLine', () => {
  it('puts every line in the main deck while no header opens another section', () => {
    expect(sectionsOf('4 Forest\n\n// ramp\n2 Sol Ring')).toEqual([
      'mainDeck',
      'mainDeck',
      'mainDeck',
      'mainDeck',
    ]);
  });

  it('puts the lines after a sideboard header in the sideboard, the header too', () => {
    expect(sectionsOf('Deck\n4 Forest\nSideboard\n2 Pyroblast')).toEqual([
      'mainDeck',
      'mainDeck',
      'sideboard',
      'sideboard',
    ]);
  });

  it('reads a header however deckbuilders write it: any case, with a card count and a colon', () => {
    expect(sectionsOf('SIDEBOARD (15):\n2 Pyroblast\nsideboard:\n1 Duress')).toEqual([
      'sideboard',
      'sideboard',
      'sideboard',
      'sideboard',
    ]);
  });

  it('opens the commander, lands and tokens sections at their headers', () => {
    expect(sectionsOf('Commanders\n1 Atraxa\nLands\n30 Forest\nTokens\n1 Treasure')).toEqual([
      'commander',
      'commander',
      'lands',
      'lands',
      'tokens',
      'tokens',
    ]);
  });

  it('goes back to the main deck at any other header', () => {
    expect(sectionsOf('Sideboard\n2 Pyroblast\nCreatures\n4 Delver\nMainboard\n1 Ponder')).toEqual([
      'sideboard',
      'sideboard',
      'mainDeck',
      'mainDeck',
      'mainDeck',
      'mainDeck',
    ]);
  });

  it('reads Main and Main deck as the main deck too', () => {
    expect(
      sectionsOf('Sideboard\n1 Duress\nMain\n4 Delver\nSideboard\nMain deck:\n1 Ponder'),
    ).toEqual([
      'sideboard',
      'sideboard',
      'mainDeck',
      'mainDeck',
      'sideboard',
      'mainDeck',
      'mainDeck',
    ]);
  });

  it("puts a line marked with MTGO's sideboard prefix in the sideboard, wherever it is written", () => {
    expect(sectionsOf('4 Forest\nSB: 2 Pyroblast\n1 Ponder\nLands\n  sb:1 Duress')).toEqual([
      'mainDeck',
      'sideboard',
      'mainDeck',
      'lands',
      'sideboard',
    ]);
  });

  it('opens no section at a header behind the sideboard prefix: that line is a sideboard card', () => {
    expect(sectionsOf('4 Forest\nSB: Lands\n1 Ponder')).toEqual([
      'mainDeck',
      'sideboard',
      'mainDeck',
    ]);
  });

  it('never takes a card named like a section word for a header', () => {
    expect(sectionsOf('Sideboard\n1 Deck of Many Things')).toEqual(['sideboard', 'sideboard']);
  });
});
