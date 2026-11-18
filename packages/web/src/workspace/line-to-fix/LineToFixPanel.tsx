import type { Generator } from '../../generator/use-generator.ts';
import { CandidateCarousel } from '../card-grid/CandidateCarousel.tsx';
import {
  isSelected,
  lineNameOf,
  type GridTile,
  type ImagelessGridTile,
  type TileSelection,
} from '../card-grid/grid-tiles.ts';
import { LineToFixHint } from './LineToFixHint.tsx';
import { RemoveLineButton } from './RemoveLineButton.tsx';

/**
 * The selected tile when it stands for a line with no `LinePanel` (still to recognise, not found
 * or ambiguous); `null` otherwise.
 */
export function lineToFixOf(
  gridTiles: readonly GridTile[],
  selection: TileSelection | null,
): ImagelessGridTile | null {
  const gridTile = gridTiles.find((tile) => isSelected(tile, selection));
  return gridTile?.kind === 'imageless' && gridTile.line?.status !== 'resolved' ? gridTile : null;
}

/** A line to fix as it is written, what is wrong with it, and the cards an ambiguous one could mean. */
export function LineToFixPanel({
  generator,
  lineToFix,
}: {
  readonly generator: Generator;
  readonly lineToFix: ImagelessGridTile;
}) {
  const { reason, writtenIndex, writtenLine, line } = lineToFix;
  return (
    <div className="flex flex-col gap-3 text-sm">
      <p className="font-mono break-words">{writtenLine.trim()}</p>
      <LineToFixHint reason={reason} isResolving={generator.isResolving} />
      {line?.status === 'ambiguous' && (
        <CandidateCarousel
          candidates={line.candidates}
          lang={generator.defaultLang}
          onPick={(oracleId) => generator.pickCandidate(writtenIndex, oracleId)}
        />
      )}
      {reason !== 'pending' && (
        <RemoveLineButton
          lineName={lineNameOf(lineToFix)}
          className="self-start"
          onRemove={() => generator.removeLine(writtenIndex)}
        />
      )}
    </div>
  );
}
