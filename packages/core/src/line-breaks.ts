/** A line break in a decklist text, written either way. */
export const LINE_BREAK = /\r?\n/;

/** `text` with every line break written as `\n`, the way a textarea holds it. */
export function withLineFeedBreaks(text: string): string {
  return text.replace(new RegExp(LINE_BREAK, 'g'), '\n');
}

/**
 * Whether the change from `previousText` to `nextText`, which left the caret at
 * `caretAfterChange`, wrote a line break, typed or pasted, wherever it landed and however
 * long the text it replaced.
 */
export function changeWritesALineBreak(
  previousText: string,
  nextText: string,
  caretAfterChange: number,
): boolean {
  // A change that leaves the caret before what it wrote, as an undo can, still adds breaks.
  if (lineBreakCount(nextText) > lineBreakCount(previousText)) return true;
  // The text after the caret is the text the change left as it was.
  const keptAfterLength = nextText.length - caretAfterChange;
  const replacedEnd = previousText.length - keptAfterLength;
  let writtenStart = 0;
  while (
    writtenStart < Math.min(replacedEnd, caretAfterChange) &&
    previousText[writtenStart] === nextText[writtenStart]
  ) {
    writtenStart += 1;
  }
  return nextText.slice(writtenStart, caretAfterChange).includes('\n');
}

function lineBreakCount(text: string): number {
  return text.split('\n').length - 1;
}
