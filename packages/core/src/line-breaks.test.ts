import { describe, expect, it } from 'vitest';
import { changeWritesALineBreak, withLineFeedBreaks } from './index.ts';

describe('withLineFeedBreaks', () => {
  it('writes every line break as a line feed, the way a textarea holds it', () => {
    expect(withLineFeedBreaks('4 Sol Ring\r\n1 Lightning Bolt\n2 Ponder\r\n')).toBe(
      '4 Sol Ring\n1 Lightning Bolt\n2 Ponder\n',
    );
  });
});

describe('changeWritesALineBreak', () => {
  it('sees the line break a paste writes over a longer text', () => {
    const previousText = '4 Sol Ring\n1 Lightning Bolt\n2 Brainstorm\n';
    const nextText = '4 Sol Ring\n1 Ponder\n';
    expect(changeWritesALineBreak(previousText, nextText, nextText.length)).toBe(true);
  });

  it('sees the line break a paste writes over a text with as many lines', () => {
    const previousText = '4 Sol Ring\n1 Lightning Bolt\n';
    const nextText = '2 Ponder\n1 Island\n';
    expect(changeWritesALineBreak(previousText, nextText, nextText.length)).toBe(true);
  });

  it('sees the line break a paste in the middle writes, even before a line written the same', () => {
    const previousText = '4 Sol Ring\n2 Brainstorm';
    const nextText = '4 Sol Ring\n4 Sol Ring\n2 Brainstorm';
    expect(changeWritesALineBreak(previousText, nextText, '4 Sol Ring\n4 Sol Ring\n'.length)).toBe(
      true,
    );
  });

  it('sees no line break in a letter typed in the middle of the text', () => {
    const previousText = '4 Sol Ring\n1 Lightning Bol\n2 Brainstorm';
    const nextText = '4 Sol Ring\n1 Lightning Bolt\n2 Brainstorm';
    expect(
      changeWritesALineBreak(previousText, nextText, '4 Sol Ring\n1 Lightning Bolt'.length),
    ).toBe(false);
  });

  it('sees no line break when a line break is deleted', () => {
    const previousText = '4 Sol Ring\n1 Lightning Bolt';
    const nextText = '4 Sol Ring1 Lightning Bolt';
    expect(changeWritesALineBreak(previousText, nextText, '4 Sol Ring'.length)).toBe(false);
  });
});
