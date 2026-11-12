import {
  HEADER_OF_SECTION,
  sectionOfEachWrittenLine,
  sectionOpenedBy,
  withSideboardPrefix,
  withoutSideboardPrefix,
} from './decklist-section.ts';
import { writtenLinesOf } from './decklist-text.ts';
import { namesACard } from './decklist.ts';
import type { DecklistSection } from './types.ts';

/**
 * Where a moved line goes: into `section`, right before or after the line written at
 * `nextTo.writtenIndex`, or at the end of the section when `nextTo` is `null`.
 */
export interface LineDestination {
  readonly section: DecklistSection;
  readonly nextTo: { readonly writtenIndex: number; readonly side: 'before' | 'after' } | null;
}

/** What moving a line makes of the decklist text. */
export interface LineMove {
  readonly text: string;
  /**
   * For each written line of the new text, where it was written before; `null` for a line the
   * move wrote, such as a new section header.
   */
  readonly previousWrittenIndexes: readonly (number | null)[];
}

/** A written line of the text being rewritten, with where it was written before. */
interface PlacedLine {
  readonly writtenLine: string;
  readonly previousWrittenIndex: number | null;
}

/**
 * Where to write a line at the end of `section` among `lines`: after the last line of the
 * section that names a card, or right under its last header when it has none; `null` when the
 * text has no header of it either.
 */
function endOfSection(lines: readonly PlacedLine[], section: DecklistSection): number | null {
  const sections = sectionOfEachWrittenLine(lines.map(({ writtenLine }) => writtenLine));
  const lastCard = lines.findLastIndex(
    ({ writtenLine }, index) => sections[index] === section && namesACard(writtenLine),
  );
  const lastHeader = lines.findLastIndex(
    ({ writtenLine }) => sectionOpenedBy(writtenLine) === section,
  );
  const last = lastCard === -1 ? lastHeader : lastCard;
  return last === -1 ? null : last + 1;
}

/** `lines` with the header of `section` written at the end, after a blank line. */
function withSectionOpened(lines: readonly PlacedLine[], section: DecklistSection): PlacedLine[] {
  const endsBlank = lines.at(-1)?.writtenLine.trim() === '';
  const written = (writtenLine: string): PlacedLine => ({
    writtenLine,
    previousWrittenIndex: null,
  });
  return [...lines, ...(endsBlank ? [] : [written('')]), written(HEADER_OF_SECTION[section])];
}

/**
 * The written line as it reads in `section` when written at `at` among `writtenLines`: a line
 * that lands outside `section` takes the sideboard prefix to join the sideboard, or loses it to
 * leave the sideboard.
 */
function writtenInSection(
  writtenLines: readonly string[],
  at: number,
  section: DecklistSection,
): string {
  const writtenLine = writtenLines[at] ?? '';
  if (sectionOfEachWrittenLine(writtenLines)[at] === section) return writtenLine;
  return section === 'sideboard'
    ? withSideboardPrefix(writtenLine)
    : withoutSideboardPrefix(writtenLine);
}

/**
 * The decklist text with the line written at `writtenIndex` moved to `destination`, into its
 * section, which a header opens at the end of the text if the text has none yet. Blank lines,
 * comments and headers stay where they are.
 */
export function moveWrittenLine(
  text: string,
  writtenIndex: number,
  { section, nextTo }: LineDestination,
): LineMove {
  const all = writtenLinesOf(text).map((writtenLine, index): PlacedLine => ({
    writtenLine,
    previousWrittenIndex: index,
  }));
  const movedLine = all[writtenIndex];
  if (!movedLine) throw new Error(`No line is written at ${writtenIndex}`);
  let others = all.filter((line) => line !== movedLine);
  let at: number;
  if (nextTo) {
    const target = others.findIndex((line) => line.previousWrittenIndex === nextTo.writtenIndex);
    if (target === -1) throw new Error(`No other line is written at ${nextTo.writtenIndex}`);
    at = target + (nextTo.side === 'after' ? 1 : 0);
  } else {
    const end = endOfSection(others, section);
    if (end === null) others = withSectionOpened(others, section);
    at = end ?? others.length;
  }
  const placed = others.toSpliced(at, 0, movedLine);
  const writtenLines = placed.map(({ writtenLine }) => writtenLine);
  return {
    text: writtenLines.with(at, writtenInSection(writtenLines, at, section)).join('\n'),
    previousWrittenIndexes: placed.map(({ previousWrittenIndex }) => previousWrittenIndex),
  };
}
