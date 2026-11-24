import { useState } from 'react';
import type { Generator } from '../../generator/use-generator.ts';
import type { ImagelessGridTile } from '../card-grid/grid-tiles.ts';

/** The actions of the guide's steps that leave no mark of their own in the generator's state. */
interface ActionsSeen {
  /** The decklist text written or loaded. */
  readonly hasWrittenDecklist: boolean;
  readonly hasChangedPrint: boolean;
  readonly hasFixedLine: boolean;
  readonly hasMadePdf: boolean;
}

/** What the guide learns from watching the generator, for its steps to know whether they are done. */
export interface ActionsSeenByGuide {
  /**
   * A first line recognised, or the example loaded; once the guide is started over, only with
   * the decklist written to since.
   */
  readonly hasStartedDecklist: boolean;
  readonly hasChangedPrint: boolean;
  readonly hasFixedLine: boolean;
  readonly hasMadePdf: boolean;
}

const NONE_SEEN: ActionsSeen = {
  hasWrittenDecklist: false,
  hasChangedPrint: false,
  hasFixedLine: false,
  hasMadePdf: false,
};

/**
 * `generator` as the workspace hands it on, telling the guide of the actions in
 * `ActionsSeenByGuide` as the user takes them, wherever in the workspace: a print tapped in the
 * print picker, a line among `linesToFix` given its card or removed, the PDF button pressed, the
 * decklist written. The guide started over for the `restartCount`th time has seen none of them
 * yet.
 */
export function useGeneratorWatchedByGuide(
  generator: Generator,
  linesToFix: readonly ImagelessGridTile[],
  restartCount: number,
): { readonly generator: Generator; readonly seen: ActionsSeenByGuide } {
  const [seenSinceRestart, setSeenSinceRestart] = useState({ restartCount, seen: NONE_SEEN });
  const seenInThisRun = (since: typeof seenSinceRestart) =>
    since.restartCount === restartCount ? since.seen : NONE_SEEN;
  const see = (action: keyof ActionsSeen) =>
    setSeenSinceRestart((current) => {
      const seenNow = seenInThisRun(current);
      return seenNow[action] ? current : { restartCount, seen: { ...seenNow, [action]: true } };
    });
  const isLineToFix = (writtenIndex: number) =>
    linesToFix.some((lineToFix) => lineToFix.writtenIndex === writtenIndex);
  const { hasWrittenDecklist, ...seenActions } = seenInThisRun(seenSinceRestart);
  return {
    seen: {
      ...seenActions,
      hasStartedDecklist:
        generator.isDecklistUnderWay && (restartCount === 0 || hasWrittenDecklist),
    },
    generator: {
      ...generator,
      writeDecklistText: (nextText, caretAfterChange) => {
        see('hasWrittenDecklist');
        generator.writeDecklistText(nextText, caretAfterChange);
      },
      loadDecklistText: (text, split) => {
        see('hasWrittenDecklist');
        generator.loadDecklistText(text, split);
      },
      chooseAllocations: (writtenIndex, allocations) => {
        see('hasChangedPrint');
        generator.chooseAllocations(writtenIndex, allocations);
      },
      pickCandidate: (writtenIndex, oracleId) => {
        see('hasFixedLine');
        generator.pickCandidate(writtenIndex, oracleId);
      },
      removeLine: (writtenIndex) => {
        if (isLineToFix(writtenIndex)) see('hasFixedLine');
        generator.removeLine(writtenIndex);
      },
      pdf: {
        ...generator.pdf,
        makeOrShare: () => {
          see('hasMadePdf');
          generator.pdf.makeOrShare();
        },
      },
    },
  };
}
