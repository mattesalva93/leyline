import type { ResolvedLine } from '@mtg-suite/core';
import { LinePanel } from '../LinePanel.tsx';
import type { Generator } from '../use-generator.ts';

/** A resolved line of the decklist, with where it is written. */
export interface LineInText {
  readonly writtenIndex: number;
  readonly line: ResolvedLine;
}

/**
 * The line of the tile at `selectedLineIndex`, when it has a panel: only a resolved line does.
 * `null` when no tile is selected.
 */
export function lineWithPanel(
  generator: Generator,
  selectedLineIndex: number | null,
): LineInText | null {
  if (selectedLineIndex === null) return null;
  const line = generator.lineAt(selectedLineIndex);
  return line?.status === 'resolved' ? { writtenIndex: selectedLineIndex, line } : null;
}

/** The `LinePanel` of `lineInText`, its changes going to the generator. */
export function SelectedLinePanel({
  generator,
  lineInText: { writtenIndex, line },
}: {
  readonly generator: Generator;
  readonly lineInText: LineInText;
}) {
  return (
    <LinePanel
      // A new line starts its panel afresh: its own prints, scrolled to the top.
      key={writtenIndex}
      line={line}
      onLanguageChange={(lang) => generator.changeLineLanguage(writtenIndex, lang)}
      onQuantityChange={(quantity) => generator.changeLineQuantity(writtenIndex, quantity)}
      onAllocationChoice={(allocations) => generator.chooseAllocations(writtenIndex, allocations)}
    />
  );
}
