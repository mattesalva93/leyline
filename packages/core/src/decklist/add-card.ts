import {
  HEADER_OF_SECTION,
  SECTION_BEFORE_ANY_HEADER,
  sectionOfEachWrittenLine,
} from './decklist-section.ts';
import { writtenLinesOf } from './decklist-text.ts';
import { parseLine, resolvedLine, writtenWithQuantity, type ParsedCardLine } from './decklist.ts';
import { cardKeys, nameKey } from '../name-match.ts';
import { moveWrittenLine, type LineMove } from './move-written-line.ts';
import { isTokenPrint, writtenNamingPrint } from '../tokens/token-line.ts';
import type {
  Candidate,
  DecklistLine,
  DecklistSection,
  Lang,
  Print,
  ResolvedLine,
} from '../types.ts';

/** The card the user picked to add, and the section it goes into. */
export interface CardToAdd {
  readonly section: DecklistSection;
  readonly candidate: Candidate;
  /** The language the line asks for: the one `candidate`'s default print was picked in. */
  readonly lang: Lang;
}

/** A line of the decklist text the server answered for, with where it is written. */
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
        /**
         * The card came in as one more copy on the section's line of it, now of `quantity`: a
         * line resolved to the card, or one not resolved to any card yet that bears its name.
         */
        readonly added: 'copy';
        readonly quantity: number;
      }
  );

/**
 * The decklist text with one copy of the card added to its section: one more on the section's
 * line of the card when it has one, otherwise a line of its own, written by the card's English
 * name after the section's last card; a token's line names its default print by set and number
 * too. A section the text has no header of opens at its end.
 */
export function addCardToSection(
  text: string,
  { section, candidate, lang }: CardToAdd,
  linesInText: readonly LineInText[],
): CardAddition {
  const writtenLines = writtenLinesOf(text);
  const sections = sectionOfEachWrittenLine(writtenLines);
  const { defaultPrint } = candidate;
  const cardNames = cardKeys(candidate.card.name, defaultPrint ? [defaultPrint] : []);
  /** Whether `parsed`, not resolved to a card yet or ambiguous, is a line of the card. */
  function namesTheCard(parsed: ParsedCardLine): boolean {
    if (!cardNames.includes(nameKey(parsed.name))) return false;
    // Other tokens share a token's name: only its set and number tell its line apart.
    return !isTokenPrint(defaultPrint) || namesPrint(parsed, defaultPrint);
  }
  /** The quantity of the line written at `writtenIndex` when it is a line of the card. */
  function quantityOfCardAt(writtenIndex: number): number | null {
    const parsed = parseLine(writtenLines[writtenIndex] ?? '');
    const line = linesInText.find((inText) => inText.writtenIndex === writtenIndex)?.line;
    if (parsed?.kind !== 'card' || sections[writtenIndex] !== section) return null;
    // A line resolved to another card is not this card's, whatever it is written as.
    const isTheCard =
      line?.status === 'resolved'
        ? line.card.oracleId === candidate.card.oracleId
        : namesTheCard(parsed);
    return isTheCard ? parsed.quantity : null;
  }
  const quantities = writtenLines.map((_writtenLine, index) => quantityOfCardAt(index));
  const existingIndex = quantities.findLastIndex((quantity) => quantity !== null);
  const existingQuantity = quantities[existingIndex];
  if (existingQuantity != null) {
    const quantity = existingQuantity + 1;
    return {
      added: 'copy',
      text: writtenLines
        .with(existingIndex, writtenWithQuantity(writtenLines[existingIndex] ?? '', quantity))
        .join('\n'),
      previousWrittenIndexes: writtenLines.map((_writtenLine, index) => index),
      writtenIndex: existingIndex,
      quantity,
    };
  }
  const byName = `1 ${candidate.card.name}`;
  const newLine = isTokenPrint(defaultPrint)
    ? writtenNamingPrint(byName, candidate.card.name, defaultPrint)
    : byName;
  const written = writeLineAtSectionEnd(text, newLine, section);
  const writtenLine = writtenLinesOf(written.text)[written.writtenIndex] ?? newLine;
  return {
    added: 'line',
    ...written,
    line: resolvedLine({ text: writtenLine, quantity: 1, lang }, candidate),
  };
}

/**
 * The decklist text with `newLine` written after the last card of `section`. A section the
 * text has no header of opens at its end, before the Tokens section if it has one.
 */
export function writeLineAtSectionEnd(
  text: string,
  newLine: string,
  section: DecklistSection,
): LineMove & { readonly writtenIndex: number } {
  if (text.trim() === '') {
    // A line above every header is in the main deck: any other section needs its header first.
    const writtenLinesAdded =
      section === SECTION_BEFORE_ANY_HEADER ? [newLine] : [HEADER_OF_SECTION[section], newLine];
    return {
      text: writtenLinesAdded.join('\n'),
      previousWrittenIndexes: writtenLinesAdded.map(() => null),
      writtenIndex: writtenLinesAdded.length - 1,
    };
  }
  // Written at the end first, then moved: the move knows where a section ends and how to open it.
  const writtenLines = writtenLinesOf(text);
  const appendedIndex = writtenLines.length;
  const move = moveWrittenLine([...writtenLines, newLine].join('\n'), appendedIndex, {
    section,
    nextTo: null,
  });
  return {
    text: move.text,
    previousWrittenIndexes: move.previousWrittenIndexes.map((index) =>
      index === appendedIndex ? null : index,
    ),
    writtenIndex: move.previousWrittenIndexes.indexOf(appendedIndex),
  };
}

/** Whether `parsed` names `print` by its set and collector number. */
function namesPrint({ printRef }: ParsedCardLine, print: Print): boolean {
  return (
    printRef?.set === print.set && printRef.collectorNumber === print.collectorNumber.toLowerCase()
  );
}
