/** A line break in a decklist text, written either way. */
export const LINE_BREAK = /\r?\n/;

/** `text` with every line break written as `\n`, the way a textarea holds it. */
export function withLineFeedBreaks(text: string): string {
  return text.replace(new RegExp(LINE_BREAK, 'g'), '\n');
}
