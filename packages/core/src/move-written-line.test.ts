import { describe, expect, it } from 'vitest';
import { moveWrittenLine, sectionOfEachWrittenLine, writtenLinesOf } from './index.ts';

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
});
