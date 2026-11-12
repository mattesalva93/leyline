import type { ResolvedLine } from '@mtg-suite/core';
import { LinePanel } from '../LinePanel.tsx';
import type { Generator } from '../use-generator.ts';

/** A line that has a `LinePanel`: a resolved one, with where it is written. */
export interface PanelLine {
  readonly writtenIndex: number;
  readonly line: ResolvedLine;
}

/** The line written at `writtenIndex` when it has a panel; `null` for no index or no panel. */
export function panelLineAt(generator: Generator, writtenIndex: number | null): PanelLine | null {
  if (writtenIndex === null) return null;
  const line = generator.lineAt(writtenIndex);
  return line?.status === 'resolved' ? { writtenIndex, line } : null;
}

/** The `LinePanel` of `panelLine`, its changes going to the generator. */
export function SelectedLinePanel({
  generator,
  panelLine: { writtenIndex, line },
}: {
  readonly generator: Generator;
  readonly panelLine: PanelLine;
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
