import { describe, expect, it } from 'vitest';
import {
  createInMemoryCatalog,
  lineRewrittenByMove,
  moveWrittenLine,
  resolveDecklist,
  sectionOfEachWrittenLine,
  writtenLinesOf,
} from './index.ts';
import { aCard, aPrint } from './test-fixtures.ts';

const catalog = createInMemoryCatalog([
  { card: aCard({ oracleId: 'forest', name: 'Forest' }), prints: [aPrint({ id: 'forest-fdn' })] },
]);

/** What the server resolves `writtenLine` to. */
async function resolutionOf(writtenLine: string) {
  const [line] = await resolveDecklist(writtenLine, catalog, { today: '2026-11-12', lang: 'en' });
  if (!line) throw new Error(`"${writtenLine}" names no card`);
  return line;
}

describe('moveWrittenLine', () => {
  it('writes the line right after the line it is dropped after, every other line as it was', () => {
    const text = 'Deck\n4 Forest\n\n// ramp\n1 Sol Ring\n2 Brainstorm';

    const move = moveWrittenLine(text, 1, {
      section: 'mainDeck',
      nextTo: { writtenIndex: 4, side: 'after' },
    });

    expect(move.text).toBe('Deck\n\n// ramp\n1 Sol Ring\n4 Forest\n2 Brainstorm');
  });

  it('writes the line right before the line it is dropped before', () => {
    const move = moveWrittenLine('4 Forest\n1 Sol Ring\n2 Brainstorm', 2, {
      section: 'mainDeck',
      nextTo: { writtenIndex: 0, side: 'before' },
    });

    expect(move.text).toBe('2 Brainstorm\n4 Forest\n1 Sol Ring');
  });

  it("moves the line into another section by writing it under that section's header", () => {
    const text = '4 Forest\n1 Sol Ring\n\nSideboard\n2 Pyroblast';

    const move = moveWrittenLine(text, 0, {
      section: 'sideboard',
      nextTo: { writtenIndex: 4, side: 'before' },
    });

    expect(move.text).toBe('1 Sol Ring\n\nSideboard\n4 Forest\n2 Pyroblast');
    expect(sectionOfEachWrittenLine(writtenLinesOf(move.text))[3]).toBe('sideboard');
  });

  it('gives the line the sideboard prefix when it joins sideboard lines written with one', () => {
    const move = moveWrittenLine('4 Forest\n1 Sol Ring\nSB: 2 Pyroblast', 0, {
      section: 'sideboard',
      nextTo: { writtenIndex: 2, side: 'after' },
    });

    expect(move.text).toBe('1 Sol Ring\nSB: 2 Pyroblast\nSB: 4 Forest');
  });

  it('takes the sideboard prefix off a line moved out of the sideboard', () => {
    const move = moveWrittenLine('4 Forest\nSB: 2 Pyroblast', 1, {
      section: 'mainDeck',
      nextTo: { writtenIndex: 0, side: 'before' },
    });

    expect(move.text).toBe('2 Pyroblast\n4 Forest');
  });

  it('tells where each line of the new text was written before', () => {
    const move = moveWrittenLine('4 Forest\n\n1 Sol Ring\n2 Brainstorm', 0, {
      section: 'mainDeck',
      nextTo: { writtenIndex: 2, side: 'after' },
    });

    expect(move.previousWrittenIndexes).toEqual([1, 2, 0, 3]);
  });

  it('writes the line at the end of its section when dropped on no line', () => {
    const text = 'Deck\n4 Forest\n1 Sol Ring\n\nSideboard\n2 Pyroblast\n// end';

    const move = moveWrittenLine(text, 1, { section: 'sideboard', nextTo: null });

    expect(move.text).toBe('Deck\n1 Sol Ring\n\nSideboard\n2 Pyroblast\n4 Forest\n// end');
  });

  it('opens the sideboard with its header at the end of the text when there is none yet', () => {
    const move = moveWrittenLine('4 Forest\n1 Sol Ring', 0, { section: 'sideboard', nextTo: null });

    expect(move.text).toBe('1 Sol Ring\n\nSideboard\n4 Forest');
    expect(move.previousWrittenIndexes).toEqual([1, null, null, 0]);
  });

  it('opens a missing section after a blank last line without adding another', () => {
    const move = moveWrittenLine('4 Forest\n1 Sol Ring\n', 0, {
      section: 'sideboard',
      nextTo: null,
    });

    expect(move.text).toBe('1 Sol Ring\n\nSideboard\n4 Forest');
  });

  it('opens a missing section before the Tokens section, which stays the last', () => {
    const move = moveWrittenLine('4 Forest\n1 Sol Ring\n\nTokens\n1 Treasure', 0, {
      section: 'sideboard',
      nextTo: null,
    });

    expect(move.text).toBe('1 Sol Ring\n\nSideboard\n4 Forest\n\nTokens\n1 Treasure');
    expect(move.previousWrittenIndexes).toEqual([1, 2, null, 0, null, 3, 4]);
  });

  it.each(['commander', 'mainDeck', 'lands', 'sideboard', 'tokens'] as const)(
    'opens the %s section with a header that reads as that section',
    (section) => {
      const text =
        section === 'mainDeck' ? 'Sideboard\n4 Forest\n1 Sol Ring' : '4 Forest\n1 Sol Ring';
      const from = section === 'mainDeck' ? 1 : 0;

      const move = moveWrittenLine(text, from, { section, nextTo: null });

      const sections = sectionOfEachWrittenLine(writtenLinesOf(move.text));
      expect(sections.at(-1)).toBe(section);
    },
  );

  it('writes the line under the header of a section that has no card left, opening no other', () => {
    const move = moveWrittenLine('4 Forest\nSideboard\n// none yet\nLands\n1 Sol Ring', 0, {
      section: 'sideboard',
      nextTo: null,
    });

    expect(move.text).toBe('Sideboard\n4 Forest\n// none yet\nLands\n1 Sol Ring');
  });
});

describe('lineRewrittenByMove', () => {
  it.each([
    ['2 Forest', 'SB: 2 Forest'],
    ['  sb:2 Forest', '  2 Forest'],
  ])(
    'resolves "%s" moved as "%s" just as the server resolves the rewritten line',
    async (writtenLine, rewritten) => {
      const line = lineRewrittenByMove(await resolutionOf(writtenLine), rewritten);

      expect(line).toEqual(await resolutionOf(rewritten));
    },
  );

  it('refuses a rewrite that changes more than the sideboard prefix', async () => {
    const line = await resolutionOf('2 Forest');

    expect(() => lineRewrittenByMove(line, 'SB: 3 Forest')).toThrow();
  });
});
