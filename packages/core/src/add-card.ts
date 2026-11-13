import { sectionOfEachWrittenLine } from './decklist-section.ts';
import { writtenLinesOf } from './decklist-text.ts';
import { resolvedLine, setLineQuantity } from './decklist.ts';
import { moveWrittenLine, type LineMove } from './move-written-line.ts';
import type { Candidate, DecklistLine, DecklistSection, Lang, ResolvedLine } from './types.ts';

/** The card the user picked to add, and the section it goes into. */
export interface CardToAdd {
  readonly section: DecklistSection;
  readonly candidate: Candidate;
  /** The language the line asks for: the one `candidate`'s default print was picked in. */
  readonly lang: Lang;
}

/** A line of the decklist text the server resolved, with where it is written. */
export interface LineInText {
  readonly writtenIndex: number;
  readonly line: DecklistLine;
}

/** What adding a card makes of the decklist text. */
export type CardAddition = LineMove & {
  /** Where the line holding the added copy is written in the new text. */
  readonly writtenIndex: number;
} & (
    | {
        /** The card came in on a line of its own, already resolved to `candidate`. */
        readonly added: 'line';
        readonly line: ResolvedLine;
      }
    | {
        /** The card came in as one more copy on the section's line of it, now of `quantity`. */
        readonly added: 'copy';
        readonly quantity: number;
      }
  );

/**
 * The decklist text with one copy of the card added to its section: one more on the section's
 * line of the card when it has one, otherwise a line of its own, written by the card's English
 * name after the section's last card. A section the text has no header of opens at its end.
 */
export function addCardToSection(
  text: string,
  { section, candidate, lang }: CardToAdd,
  linesInText: readonly LineInText[],
): CardAddition {
  const writtenLines = writtenLinesOf(text);
  const sections = sectionOfEachWrittenLine(writtenLines);
  const existing = linesInText.findLast(
    ({ writtenIndex, line }) =>
      sections[writtenIndex] === section &&
      line.status === 'resolved' &&
      line.card.oracleId === candidate.card.oracleId,
  );
  if (existing) {
    const quantity = existing.line.quantity + 1;
    return {
      added: 'copy',
      text: writtenLines
        .with(existing.writtenIndex, setLineQuantity(existing.line, quantity).text)
        .join('\n'),
      previousWrittenIndexes: writtenLines.map((_writtenLine, index) => index),
      writtenIndex: existing.writtenIndex,
      quantity,
    };
  }
  const newLine = `1 ${candidate.card.name}`;
  const lineOf = (writtenLine: string) =>
    resolvedLine({ text: writtenLine, quantity: 1, lang }, candidate);
  if (text.trim() === '') {
    return {
      added: 'line',
      text: newLine,
      previousWrittenIndexes: [null],
      writtenIndex: 0,
      line: lineOf(newLine),
    };
  }
  // Written at the end first, then moved: the move knows where a section ends and how to open it.
  const appendedIndex = writtenLines.length;
  const move = moveWrittenLine([...writtenLines, newLine].join('\n'), appendedIndex, {
    section,
    nextTo: null,
  });
  const writtenIndex = move.previousWrittenIndexes.indexOf(appendedIndex);
  return {
    added: 'line',
    text: move.text,
    previousWrittenIndexes: move.previousWrittenIndexes.map((index) =>
      index === appendedIndex ? null : index,
    ),
    writtenIndex,
    line: lineOf(writtenLinesOf(move.text)[writtenIndex] ?? newLine),
  };
}
