import {
  applyAllocationChoice,
  applyCandidateChoice,
  changeTileQuantity as changeTileQuantityInText,
  writtenLinesOf,
  copyCount,
  defaultSheetOptions,
  fitAllocations,
  hasPrintableCopies,
  layoutSheet,
  lineRewrittenByMove,
  moveWrittenLine,
  sectionOfEachWrittenLine,
  setLineQuantity,
  unprintedLines,
  type AllocationChoice,
  type DecklistLine,
  type DecklistSection,
  type Lang,
  type LineDestination,
  type LineMove,
  type Print,
  type SheetLayout,
  type SheetOptions,
} from '@mtg-suite/core';
import { useEffect, useRef, useState } from 'react';
import { fetchPrintPage, resolveDecklistText } from './api.ts';
import { loadDefaultLang, saveDefaultLang } from './default-lang.ts';
import { allocationsSplitOverPrints, type LineSplitOverPrints } from './line-split.ts';
import { useSheetPdf, type SheetPdf } from './use-sheet-pdf.ts';

/**
 * What the server resolved each written line to, in each language asked for, keyed by
 * `resolutionKey`. `null` marks a written line that names no card (blank, header, comment).
 */
type ResolutionsByLanguage = ReadonlyMap<string, DecklistLine | null>;

function resolutionKey(lang: Lang, writtenLine: string): string {
  return `${lang}:${writtenLine}`;
}

/**
 * What the user picked on one written line, kept apart from its resolution so the picks
 * survive resolving the line again.
 */
interface LineChoices {
  /** The card picked among an ambiguous line's candidates. */
  readonly oracleId?: string;
  /** The copies allocated to prints in the print picker. */
  readonly allocations?: AllocationChoice;
}

/**
 * Names the choices of each written line: its text, and how many lines above it are written the
 * same, so two lines written alike keep choices of their own.
 */
function choicesKeysOf(writtenLines: readonly string[]): string[] {
  const linesWrittenAlike = new Map<string, number>();
  return writtenLines.map((writtenLine) => {
    const above = linesWrittenAlike.get(writtenLine) ?? 0;
    linesWrittenAlike.set(writtenLine, above + 1);
    return `${above}:${writtenLine}`;
  });
}

/** One written line of the decklist that names a card, or may once the server resolves it. */
export interface WrittenCardLine {
  /** Where the line sits in the decklist text, counting blank lines too. */
  readonly writtenIndex: number;
  readonly writtenLine: string;
  readonly section: DecklistSection;
  /**
   * `undefined` while the server has not resolved the line yet: it is shown as typed, and it
   * holds the PDF back.
   */
  readonly line: DecklistLine | undefined;
}

/**
 * The state of the generator and what the user can do to it, whatever the page that shows it
 * looks like. Lines are named by their `writtenIndex`.
 */
export interface Generator {
  readonly decklistText: string;
  /** How many lines the decklist text has, blank ones included. */
  readonly writtenLineCount: number;
  /** Takes the text as the user left it; a new line break resolves the lines before the last. */
  readonly writeDecklistText: (nextText: string) => void;
  /** Resolves every written line not resolved yet, the last one included. */
  readonly resolveEveryLine: () => void;
  /**
   * Puts a whole decklist in place of the text, every line resolved as if written by hand; with
   * `split`, that line's copies then spread over its newest prints, as if the user picked them.
   */
  readonly loadDecklistText: (text: string, split?: LineSplitOverPrints) => void;
  readonly isResolving: boolean;
  readonly lastResolveFailed: boolean;

  readonly defaultLang: Lang;
  readonly changeDefaultLanguage: (lang: Lang) => void;

  readonly cardLines: readonly WrittenCardLine[];
  readonly pickCandidate: (writtenIndex: number, oracleId: string) => void;
  readonly changeLineQuantity: (writtenIndex: number, quantity: number) => void;
  /** Gives the tile of `print` on the line at `writtenIndex` `quantity` copies; at zero it goes. */
  readonly changeTileQuantity: (writtenIndex: number, print: Print, quantity: number) => void;
  readonly chooseAllocations: (writtenIndex: number, allocations: AllocationChoice) => void;
  /** Moves the line at `writtenIndex` to `destination` in the decklist text, with its choices. */
  readonly moveLine: (writtenIndex: number, destination: LineDestination) => LineMove;

  readonly sheetOptions: SheetOptions;
  readonly changeSheetOptions: (options: SheetOptions) => void;
  /** `null` while no copy can be printed. */
  readonly sheetLayout: SheetLayout | null;
  /** How many resolved lines will not be printed. */
  readonly unprintedCount: number;
  /** How many copies the lines the server recognised ask for, printable or not. */
  readonly cardCount: number;
  /** How many pages the sheet prints on. */
  readonly pageCount: number;

  readonly pdf: SheetPdf;
}

export function useGenerator(): Generator {
  const [decklistText, setDecklistText] = useState('');
  const [defaultLang, setDefaultLang] = useState(loadDefaultLang);
  const [resolutions, setResolutions] = useState<ResolutionsByLanguage>(new Map());
  // Keyed by `choicesKeysOf`.
  const [choicesByLine, setChoicesByLine] = useState<ReadonlyMap<string, LineChoices>>(new Map());
  const [requestsInFlight, setRequestsInFlight] = useState(0);
  const [lastResolveFailed, setLastResolveFailed] = useState(false);
  const [sheetOptions, setSheetOptions] = useState<SheetOptions>(defaultSheetOptions);
  // Every `resolutionKey` already asked for, so a line is sent once per language however often
  // the decklist text changes.
  const requestedKeys = useRef(new Set<string>());
  // The line `loadDecklistText` splits once it is resolved, named by its `choicesKeysOf` key so
  // that a later edit of the text cannot hand the split to another line.
  const [pendingSplit, setPendingSplit] = useState<{
    readonly choicesKey: string;
    readonly printCount: number;
  } | null>(null);

  const writtenLines = writtenLinesOf(decklistText);
  const choicesKeys = choicesKeysOf(writtenLines);

  /** Resolves the lines not asked for yet in `lang`; `false` when the request failed. */
  async function resolveInLanguage(
    linesToResolve: readonly string[],
    lang: Lang,
  ): Promise<boolean> {
    const notRequested = [...new Set(linesToResolve)].filter(
      (writtenLine) => !requestedKeys.current.has(resolutionKey(lang, writtenLine)),
    );
    if (notRequested.length === 0) return true;
    for (const writtenLine of notRequested) {
      requestedKeys.current.add(resolutionKey(lang, writtenLine));
    }
    setRequestsInFlight((count) => count + 1);
    try {
      const resolvedLines = await resolveDecklistText(notRequested.join('\n'), lang);
      setResolutions((previous) => {
        const next = new Map(previous);
        for (const writtenLine of notRequested) next.set(resolutionKey(lang, writtenLine), null);
        for (const line of resolvedLines) next.set(resolutionKey(lang, line.text), line);
        return next;
      });
      setLastResolveFailed(false);
      return true;
    } catch {
      for (const writtenLine of notRequested) {
        requestedKeys.current.delete(resolutionKey(lang, writtenLine));
      }
      setLastResolveFailed(true);
      return false;
    } finally {
      setRequestsInFlight((count) => count - 1);
    }
  }

  function writeDecklistText(nextText: string) {
    // A new line break (typed or pasted) completes every line before the last one.
    const nextWrittenLines = writtenLinesOf(nextText);
    if (nextWrittenLines.length > writtenLines.length) {
      void resolveInLanguage(nextWrittenLines.slice(0, -1), defaultLang);
    }
    setDecklistText(nextText);
  }

  function loadDecklistText(text: string, split?: LineSplitOverPrints) {
    const loadedLines = writtenLinesOf(text);
    const choicesKey = split && choicesKeysOf(loadedLines)[split.writtenIndex];
    setPendingSplit(choicesKey ? { choicesKey, printCount: split.printCount } : null);
    setDecklistText(text);
    void resolveInLanguage(loadedLines, defaultLang);
  }

  // Switched only once every line is resolved in the new language, so no line (and nothing
  // that shows it) goes back to unresolved; a failed request keeps the lines as they were.
  // Allocated copies stay on their prints either way.
  async function changeDefaultLanguage(lang: Lang) {
    if (!(await resolveInLanguage(writtenLines, lang))) return;
    setDefaultLang(lang);
    saveDefaultLang(lang);
  }

  /** The choices of the line written at `writtenIndex`, if the user made any. */
  function choicesAt(writtenIndex: number): LineChoices | undefined {
    const key = choicesKeys[writtenIndex];
    return key === undefined ? undefined : choicesByLine.get(key);
  }

  /** Applies `change` to the choices of the line written at `writtenIndex`, if there is one. */
  function updateChoicesAt(writtenIndex: number, change: LineChoices) {
    const key = choicesKeys[writtenIndex];
    if (key === undefined) return;
    setChoicesByLine((previous) => new Map(previous).set(key, { ...previous.get(key), ...change }));
  }

  /**
   * Writes `nextWrittenLines`, the decklist text as a change made in the workspace rewrote it,
   * each line with its choices in `choicesOfEachLine`. Moving them by position, not by text,
   * keeps a rewritten line from trading choices with a line now written like it.
   */
  function writeRewrittenLines(
    nextWrittenLines: readonly string[],
    choicesOfEachLine: readonly (LineChoices | undefined)[],
  ) {
    const nextKeys = choicesKeysOf(nextWrittenLines);
    setChoicesByLine(
      new Map(
        nextKeys.flatMap((key, writtenIndex): [string, LineChoices][] => {
          const choices = choicesOfEachLine[writtenIndex];
          return choices ? [[key, choices]] : [];
        }),
      ),
    );
    setDecklistText(nextWrittenLines.join('\n'));
  }

  /** The choices of every written line, in the order of the text. */
  function choicesOfEveryLine(): (LineChoices | undefined)[] {
    return writtenLines.map((_writtenLine, writtenIndex) => choicesAt(writtenIndex));
  }

  /**
   * The line to show at `writtenIndex`: its resolution in the default language with the user's
   * picks (candidate, allocations) applied; `null` when it names no card, `undefined` while not
   * resolved yet.
   */
  function displayedLine(writtenIndex: number): DecklistLine | null | undefined {
    const writtenLine = writtenLines[writtenIndex];
    if (writtenLine === undefined) return undefined;
    const resolution = resolutions.get(resolutionKey(defaultLang, writtenLine));
    if (!resolution) return resolution;
    const { oracleId, allocations } = choicesAt(writtenIndex) ?? {};
    const withCandidate =
      oracleId === undefined ? resolution : applyCandidateChoice(resolution, oracleId);
    return allocations === undefined
      ? withCandidate
      : applyAllocationChoice(withCandidate, allocations);
  }

  /** The resolution of the line written at `writtenIndex` in the default language, if any yet. */
  function resolutionAt(writtenIndex: number): DecklistLine | null | undefined {
    const writtenLine = writtenLines[writtenIndex];
    return writtenLine === undefined
      ? undefined
      : resolutions.get(resolutionKey(defaultLang, writtenLine));
  }

  /**
   * Keeps `resolution` for its line's text rewritten for `quantity` copies, so the rewritten line
   * needs no new request, and returns that text. The quantity goes on the resolution as the
   * server sent it, never on the displayed line: the choices are applied again on top, so
   * nothing they derived goes stale.
   */
  function keepResolutionOfRewrittenLine(resolution: DecklistLine, quantity: number): string {
    const rewritten = setLineQuantity(resolution, quantity);
    keepResolution(rewritten.text, rewritten);
    return rewritten.text;
  }

  /** Keeps `resolution` as what `writtenLine` resolves to, so it needs no request. */
  function keepResolution(writtenLine: string, resolution: DecklistLine | null) {
    const key = resolutionKey(defaultLang, writtenLine);
    requestedKeys.current.add(key);
    setResolutions((previous) => new Map(previous).set(key, resolution));
  }

  /**
   * Writes the new quantity into the decklist text itself, so the text always says what gets
   * printed. The allocations are fitted to the new quantity for good, so raising it again leaves
   * the copies taken off on the default print.
   */
  function changeLineQuantity(writtenIndex: number, quantity: number) {
    const resolution = resolutionAt(writtenIndex);
    if (!resolution) return;
    const rewrittenLine = keepResolutionOfRewrittenLine(resolution, quantity);
    const choices = choicesAt(writtenIndex);
    const fitted = choices?.allocations && {
      allocations: fitAllocations(choices.allocations, quantity),
    };
    writeRewrittenLines(
      writtenLines.with(writtenIndex, rewrittenLine),
      choicesOfEveryLine().with(writtenIndex, choices && { ...choices, ...fitted }),
    );
  }

  /** Rewrites the decklist text for the tile's new quantity, keeping its line's choices. */
  function changeTileQuantity(writtenIndex: number, print: Print, quantity: number) {
    const resolution = resolutionAt(writtenIndex);
    const line = displayedLine(writtenIndex);
    if (!resolution || line?.status !== 'resolved') return;
    const change = changeTileQuantityInText(decklistText, { writtenIndex, line, print }, quantity);
    const nextWrittenLines = writtenLinesOf(change.text);
    if (!change.line) {
      writeRewrittenLines(nextWrittenLines, choicesOfEveryLine().toSpliced(writtenIndex, 1));
      return;
    }
    keepResolutionOfRewrittenLine(resolution, change.line.quantity);
    const allocations = {
      oracleId: change.line.card.oracleId,
      allocations: change.line.allocations,
    };
    writeRewrittenLines(
      nextWrittenLines,
      choicesOfEveryLine().with(writtenIndex, { ...choicesAt(writtenIndex), allocations }),
    );
  }

  /**
   * Moves the line in the decklist text, its choices with it. A move that rewrites the line (to
   * join or leave the sideboard) keeps its resolution, and the lines the move writes (a section
   * header) name no card: the move asks the server nothing, but for a moved line it has not
   * resolved yet.
   */
  function moveLine(writtenIndex: number, destination: LineDestination): LineMove {
    const move = moveWrittenLine(decklistText, writtenIndex, destination);
    const nextWrittenLines = writtenLinesOf(move.text);
    const resolution = resolutionAt(writtenIndex);
    const choices = choicesOfEveryLine();
    move.previousWrittenIndexes.forEach((previousIndex, nextIndex) => {
      const writtenLine = nextWrittenLines[nextIndex] ?? '';
      if (previousIndex === null) keepResolution(writtenLine, null);
      if (previousIndex !== writtenIndex) return;
      // A line not resolved yet is one the user is done with once they move it.
      if (resolution) keepResolution(writtenLine, lineRewrittenByMove(resolution, writtenLine));
      else void resolveInLanguage([writtenLine], defaultLang);
    });
    writeRewrittenLines(
      nextWrittenLines,
      move.previousWrittenIndexes.map((index) => (index === null ? undefined : choices[index])),
    );
    return move;
  }

  useEffect(() => {
    if (!pendingSplit) return;
    const { choicesKey, printCount } = pendingSplit;
    const writtenIndex = choicesKeys.indexOf(choicesKey);
    const line = writtenIndex === -1 ? null : displayedLine(writtenIndex);
    if (line === undefined) return; // Not resolved yet.
    setPendingSplit(null);
    if (line?.status !== 'resolved') return;
    // A failed request leaves every copy on the default print, as a line written by hand.
    fetchPrintPage(line.card.oracleId, line.lang, printCount, null).then(
      ({ prints }) => {
        const allocations = allocationsSplitOverPrints(line, prints, printCount);
        setChoicesByLine((previous) =>
          new Map(previous).set(choicesKey, { ...previous.get(choicesKey), allocations }),
        );
      },
      () => {},
    );
  });

  const sectionOfEachLine = sectionOfEachWrittenLine(writtenLines);
  const cardLines = writtenLines.flatMap((writtenLine, writtenIndex): WrittenCardLine[] => {
    const line = displayedLine(writtenIndex);
    // Never missing: there is a section for every written line.
    const section = sectionOfEachLine[writtenIndex];
    if (!section) return [];
    if (line === null || (line === undefined && writtenLine.trim() === '')) return [];
    return [{ writtenIndex, writtenLine, section, line }];
  });
  const recognisedLines = cardLines.flatMap((cardLine) => cardLine.line ?? []);
  const unresolvedCount = cardLines.length - recognisedLines.length;
  const sheet = { options: sheetOptions, lines: recognisedLines };
  const sheetLayout = hasPrintableCopies(sheet) ? layoutSheet(sheet) : null;
  const pdf = useSheetPdf(sheet, sheetLayout, unresolvedCount === 0);

  return {
    decklistText,
    writtenLineCount: writtenLines.length,
    writeDecklistText,
    resolveEveryLine: () => void resolveInLanguage(writtenLines, defaultLang),
    loadDecklistText,
    isResolving: requestsInFlight > 0,
    lastResolveFailed,
    defaultLang,
    changeDefaultLanguage: (lang) => void changeDefaultLanguage(lang),
    cardLines,
    pickCandidate: (writtenIndex, oracleId) => updateChoicesAt(writtenIndex, { oracleId }),
    changeLineQuantity,
    changeTileQuantity,
    chooseAllocations: (writtenIndex, allocations) =>
      updateChoicesAt(writtenIndex, { allocations }),
    moveLine,
    sheetOptions,
    changeSheetOptions: setSheetOptions,
    sheetLayout,
    unprintedCount: unprintedLines(sheet).length,
    cardCount: copyCount(recognisedLines),
    pageCount: sheetLayout?.pages.length ?? 0,
    pdf,
  };
}
