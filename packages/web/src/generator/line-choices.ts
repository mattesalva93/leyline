import type { AllocationChoice } from '@mtg-suite/core';

/**
 * What the user picked on one written line, kept apart from its resolution so the picks
 * survive resolving the line again.
 */
export interface LineChoices {
  /** The card picked among an ambiguous line's candidates. */
  readonly oracleId?: string;
  /** The copies allocated to prints in the print picker. */
  readonly allocations?: AllocationChoice;
}

/**
 * Names the choices of each written line: its text, and how many lines above it are written the
 * same, so two lines written alike keep choices of their own.
 */
export function choicesKeysOf(writtenLines: readonly string[]): string[] {
  const linesWrittenAlike = new Map<string, number>();
  return writtenLines.map((writtenLine) => {
    const above = linesWrittenAlike.get(writtenLine) ?? 0;
    linesWrittenAlike.set(writtenLine, above + 1);
    return `${above}:${writtenLine}`;
  });
}
