import {
  applyAllocationChoice,
  applyCandidateChoice,
  defaultSheetOptions,
  fitAllocations,
  hasPrintableCopies,
  LANGS,
  layoutSheet,
  setLineQuantity,
  unprintedLines,
  type AllocationChoice,
  type DecklistLine,
  type Lang,
  type SheetLayout,
  type SheetOptions,
} from '@mtg-suite/core';
import { useRef, useState } from 'react';
import { resolveDecklistText } from './api.ts';
import { loadDefaultLang, saveDefaultLang } from './default-lang.ts';
import { useSheetPdf, type SheetPdf } from './use-sheet-pdf.ts';

const LINE_BREAK = /\r?\n/;

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
  /** Set when the line uses another language than the default one. */
  readonly lang?: Lang;
  /** The card picked among an ambiguous line's candidates. */
  readonly oracleId?: string;
  /** The copies allocated to prints in the print picker. */
  readonly allocations?: AllocationChoice;
}

/** One written line of the decklist that names a card, or may once the server resolves it. */
export interface WrittenCardLine {
  /** Where the line sits in the decklist text, counting blank lines too. */
  readonly writtenIndex: number;
  readonly writtenLine: string;
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
  /** Takes the text as the user left it; a new line break resolves the lines before the last. */
  readonly writeDecklistText: (nextText: string) => void;
  /** Resolves every written line not resolved yet, the last one included. */
  readonly resolveEveryLine: () => void;
  readonly isResolving: boolean;
  readonly lastResolveFailed: boolean;

  readonly defaultLang: Lang;
  readonly changeDefaultLanguage: (lang: Lang) => void;

  readonly cardLines: readonly WrittenCardLine[];
  /** The line written at `writtenIndex`, with the user's choices applied; `undefined` until the server has answered for it, or when it names no card. */
  readonly lineAt: (writtenIndex: number) => DecklistLine | undefined;
  readonly pickCandidate: (writtenIndex: number, oracleId: string) => void;
  readonly changeLineLanguage: (writtenIndex: number, lang: Lang) => void;
  readonly changeLineQuantity: (writtenIndex: number, quantity: number) => void;
  readonly chooseAllocations: (writtenIndex: number, allocations: AllocationChoice) => void;

  readonly sheetOptions: SheetOptions;
  readonly changeSheetOptions: (options: SheetOptions) => void;
  /** `null` while no copy can be printed. */
  readonly sheetLayout: SheetLayout | null;
  /** How many resolved lines will not be printed. */
  readonly unprintedCount: number;

  readonly pdf: SheetPdf;
}

export function useGenerator(): Generator {
  const [decklistText, setDecklistText] = useState('');
  const [defaultLang, setDefaultLang] = useState(loadDefaultLang);
  const [resolutions, setResolutions] = useState<ResolutionsByLanguage>(new Map());
  const [choicesByLine, setChoicesByLine] = useState<ReadonlyMap<string, LineChoices>>(new Map());
  const [requestsInFlight, setRequestsInFlight] = useState(0);
  const [lastResolveFailed, setLastResolveFailed] = useState(false);
  const [sheetOptions, setSheetOptions] = useState<SheetOptions>(defaultSheetOptions);
  // Every `resolutionKey` already asked for, so a line is sent once per language however often
  // the decklist text changes.
  const requestedKeys = useRef(new Set<string>());

  const writtenLines = decklistText.split(LINE_BREAK);
  const languageOf = (writtenLine: string) => choicesByLine.get(writtenLine)?.lang ?? defaultLang;

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

  /** Resolves each written line in its own language: one request per language. */
  function resolveEachInItsLanguage(linesToResolve: readonly string[]) {
    for (const lang of LANGS) {
      void resolveInLanguage(
        linesToResolve.filter((writtenLine) => languageOf(writtenLine) === lang),
        lang,
      );
    }
  }

  function writeDecklistText(nextText: string) {
    // A new line break (typed or pasted) completes every line before the last one.
    const nextWrittenLines = nextText.split(LINE_BREAK);
    if (nextWrittenLines.length > writtenLines.length) {
      resolveEachInItsLanguage(nextWrittenLines.slice(0, -1));
    }
    setDecklistText(nextText);
  }

  function updateChoices(writtenLine: string, change: LineChoices) {
    setChoicesByLine((previous) =>
      new Map(previous).set(writtenLine, { ...previous.get(writtenLine), ...change }),
    );
  }

  /** Drops the allocations of each of `linesToForget`: they use prints in their old language. */
  function forgetAllocations(linesToForget: readonly string[]) {
    setChoicesByLine((previous) => {
      const next = new Map(previous);
      for (const writtenLine of linesToForget) {
        const { allocations: _forgotten, ...kept } = previous.get(writtenLine) ?? {};
        if (_forgotten) next.set(writtenLine, kept);
      }
      return next;
    });
  }

  // Like a line's own language, switched only once the lines that follow it are resolved: a
  // failed request keeps them, and their allocations, as they were.
  async function changeDefaultLanguage(lang: Lang) {
    const followingLines = writtenLines.filter(
      (writtenLine) => !choicesByLine.get(writtenLine)?.lang,
    );
    if (!(await resolveInLanguage(followingLines, lang))) return;
    forgetAllocations(followingLines);
    setDefaultLang(lang);
    saveDefaultLang(lang);
  }

  // Switched only once resolved, so the line (and whatever shows it) never goes back to unresolved.
  async function changeLineLanguage(writtenIndex: number, lang: Lang) {
    const writtenLine = writtenLines[writtenIndex];
    if (writtenLine === undefined || lang === languageOf(writtenLine)) return;
    if (!(await resolveInLanguage([writtenLine], lang))) return;
    forgetAllocations([writtenLine]);
    updateChoices(writtenLine, { lang });
  }

  /**
   * The line to show for `writtenLine`: its resolution in its language with the user's picks
   * (candidate, allocations) applied; `null` when it names no card, `undefined` while not resolved yet.
   */
  function displayedLine(writtenLine: string): DecklistLine | null | undefined {
    const resolution = resolutions.get(resolutionKey(languageOf(writtenLine), writtenLine));
    if (!resolution) return resolution;
    const { oracleId, allocations } = choicesByLine.get(writtenLine) ?? {};
    const withCandidate =
      oracleId === undefined ? resolution : applyCandidateChoice(resolution, oracleId);
    return allocations === undefined
      ? withCandidate
      : applyAllocationChoice(withCandidate, allocations);
  }

  /**
   * Writes the new quantity into the decklist text itself, so the text always says what gets
   * printed. The rewritten line keeps its resolution and the user's choices: no new request.
   * The quantity goes on the resolution as the server sent it, never on the displayed line:
   * the choices are applied again on top, so nothing they derived goes stale. The allocations
   * are fitted to the new quantity for good, so raising it again leaves the copies taken off on
   * the default print.
   */
  function changeLineQuantity(writtenIndex: number, quantity: number) {
    const writtenLine = writtenLines[writtenIndex];
    if (writtenLine === undefined) return;
    const lang = languageOf(writtenLine);
    const resolution = resolutions.get(resolutionKey(lang, writtenLine));
    if (!resolution) return;
    const rewritten = setLineQuantity(resolution, quantity);
    const key = resolutionKey(lang, rewritten.text);
    requestedKeys.current.add(key);
    setResolutions((previous) => new Map(previous).set(key, rewritten));
    const choices = choicesByLine.get(writtenLine);
    if (choices) {
      const { allocations } = choices;
      updateChoices(rewritten.text, {
        ...choices,
        ...(allocations && { allocations: fitAllocations(allocations, quantity) }),
      });
    }
    setDecklistText(writtenLines.with(writtenIndex, rewritten.text).join('\n'));
  }

  /** Applies `change` to the choices of the line written at `writtenIndex`, if there is one. */
  function updateChoicesAt(writtenIndex: number, change: LineChoices) {
    const writtenLine = writtenLines[writtenIndex];
    if (writtenLine !== undefined) updateChoices(writtenLine, change);
  }

  const cardLines = writtenLines.flatMap((writtenLine, writtenIndex): WrittenCardLine[] => {
    const line = displayedLine(writtenLine);
    if (line === null || (line === undefined && writtenLine.trim() === '')) return [];
    return [{ writtenIndex, writtenLine, line }];
  });
  const resolvedLines = cardLines.flatMap((cardLine) => cardLine.line ?? []);
  const unresolvedCount = cardLines.length - resolvedLines.length;
  const sheet = { options: sheetOptions, lines: resolvedLines };
  const sheetLayout = hasPrintableCopies(sheet) ? layoutSheet(sheet) : null;
  const pdf = useSheetPdf(sheet, sheetLayout, unresolvedCount === 0);

  return {
    decklistText,
    writeDecklistText,
    resolveEveryLine: () => resolveEachInItsLanguage(writtenLines),
    isResolving: requestsInFlight > 0,
    lastResolveFailed,
    defaultLang,
    changeDefaultLanguage: (lang) => void changeDefaultLanguage(lang),
    cardLines,
    lineAt: (writtenIndex) => {
      const writtenLine = writtenLines[writtenIndex];
      return writtenLine === undefined ? undefined : (displayedLine(writtenLine) ?? undefined);
    },
    pickCandidate: (writtenIndex, oracleId) => updateChoicesAt(writtenIndex, { oracleId }),
    changeLineLanguage: (writtenIndex, lang) => void changeLineLanguage(writtenIndex, lang),
    changeLineQuantity,
    chooseAllocations: (writtenIndex, allocations) =>
      updateChoicesAt(writtenIndex, { allocations }),
    sheetOptions,
    changeSheetOptions: setSheetOptions,
    sheetLayout,
    unprintedCount: unprintedLines(sheet).length,
    pdf,
  };
}
