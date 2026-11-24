import { withLineFeedBreaks } from '@leyline/core';

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
  // Written into the textarea by hand, not by the browser, so its line breaks must match.
  const pastedText = withLineFeedBreaks(pasted);
  if (pasteEnd !== text.length || pastedText === '' || pastedText.endsWith('\n')) return null;
  return `${text.slice(0, pasteStart)}${pastedText}\n`;
}
