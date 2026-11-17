import { writeLineAtSectionEnd, type LineInText } from './add-card.ts';
import { writtenLinesOf } from './decklist-text.ts';
import { resolvedLine } from './decklist.ts';
import type { LineMove } from './move-written-line.ts';
import type { ResolvedLine, SuggestedToken } from './types.ts';

/** What adding suggested tokens makes of the decklist text. */
export interface TokensAddition extends LineMove {
  /** The line of each token added, already resolved, with where it is written in the new text. */
  readonly lines: readonly (LineInText & { readonly line: ResolvedLine })[];
}

/** The line a token is written as: one copy, named by its set and number, so it means that print. */
function tokenLine({ candidate: { card, defaultPrint } }: SuggestedToken): string {
  return `1 ${card.name} (${defaultPrint.set.toUpperCase()}) ${defaultPrint.collectorNumber}`;
}

/**
 * The decklist text with a line of each of `tokens`, in their order, after the last card of
 * the Tokens section, which opens at the end of the text when it has no header.
 */
export function addTokensToSection(
  text: string,
  tokens: readonly SuggestedToken[],
): TokensAddition {
  let addition: TokensAddition = {
    text,
    previousWrittenIndexes: writtenLinesOf(text).map((_writtenLine, index) => index),
    lines: [],
  };
  for (const token of tokens) {
    const written = writeLineAtSectionEnd(addition.text, tokenLine(token), 'tokens');
    const writtenLine = writtenLinesOf(written.text)[written.writtenIndex] ?? '';
    const newIndexOf = (previousIndex: number) =>
      written.previousWrittenIndexes.indexOf(previousIndex);
    addition = {
      text: written.text,
      previousWrittenIndexes: written.previousWrittenIndexes.map((index) =>
        index === null ? null : (addition.previousWrittenIndexes[index] ?? null),
      ),
      lines: [
        ...addition.lines.map((added) => ({
          ...added,
          writtenIndex: newIndexOf(added.writtenIndex),
        })),
        {
          writtenIndex: written.writtenIndex,
          line: resolvedLine({ text: writtenLine, quantity: 1, lang: token.lang }, token.candidate),
        },
      ],
    };
  }
  return addition;
}
