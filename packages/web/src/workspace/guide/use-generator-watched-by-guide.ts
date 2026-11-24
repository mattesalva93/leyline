import { useState } from 'react';
import type { Generator } from '../../generator/use-generator.ts';
import type { ImagelessGridTile } from '../card-grid/grid-tiles.ts';

/** The actions of the guide's steps that leave no mark of their own in the generator's state. */
export interface ActionsSeenByGuide {
  readonly hasChangedPrint: boolean;
  readonly hasFixedLine: boolean;
  readonly hasMadePdf: boolean;
}

const NONE_SEEN: ActionsSeenByGuide = {
  hasChangedPrint: false,
  hasFixedLine: false,
  hasMadePdf: false,
};

/**
 * `generator` as the workspace hands it on, telling the guide of the actions in
 * `ActionsSeenByGuide` as the user takes them, wherever in the workspace: a print tapped in the
 * print picker, a line among `linesToFix` given its card or removed, the PDF button pressed.
 * The guide started over for the `restartCount`th time has seen none of them yet.
 */
export function useGeneratorWatchedByGuide(
  generator: Generator,
  linesToFix: readonly ImagelessGridTile[],
  restartCount: number,
): { readonly generator: Generator; readonly seen: ActionsSeenByGuide } {
  const [seenSinceRestart, setSeenSinceRestart] = useState({ restartCount, seen: NONE_SEEN });
  const seenInThisRun = (since: typeof seenSinceRestart) =>
    since.restartCount === restartCount ? since.seen : NONE_SEEN;
  const see = (action: keyof ActionsSeenByGuide) =>
    setSeenSinceRestart((current) => {
      const seenNow = seenInThisRun(current);
      return seenNow[action] ? current : { restartCount, seen: { ...seenNow, [action]: true } };
    });
  const isLineToFix = (writtenIndex: number) =>
    linesToFix.some((lineToFix) => lineToFix.writtenIndex === writtenIndex);
  return {
    seen: seenInThisRun(seenSinceRestart),
    generator: {
      ...generator,
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
