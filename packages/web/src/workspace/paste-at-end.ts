const LINE_BREAKS = /\r\n?/g;

/**
 * The decklist text once `pasted` takes the place of everything from `pasteStart` on, with a
 * line break after it, as if the user pressed Enter, so the last pasted line is complete too.
 * `null` when the browser's own paste is enough: the paste lands before other text, brings
 * nothing, or already ends with a line break.
 */
export function textAfterPasteAtEnd(
  text: string,
  { pasteStart, pasteEnd }: { readonly pasteStart: number; readonly pasteEnd: number },
  pasted: string,
): string | null {
  // A textarea holds line breaks as `\n` only; one written by hand must match.
  const pastedLines = pasted.replace(LINE_BREAKS, '\n');
  if (pasteEnd !== text.length || pastedLines === '' || pastedLines.endsWith('\n')) return null;
  return `${text.slice(0, pasteStart)}${pastedLines}\n`;
}
