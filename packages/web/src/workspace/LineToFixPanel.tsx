import { useTranslation } from 'react-i18next';
import type { Generator } from '../use-generator.ts';
import { CandidateButtons } from './CandidateButtons.tsx';
import {
  isSelected,
  type GridTile,
  type ImagelessGridTile,
  type TileSelection,
} from './grid-tiles.ts';
import { LineToFixHint } from './LineToFixHint.tsx';

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
  lineToFix: { reason, writtenIndex, writtenLine, line },
}: {
  readonly generator: Generator;
  readonly lineToFix: ImagelessGridTile;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3 text-sm">
      <p className="font-mono break-words">{writtenLine.trim()}</p>
      {reason === 'ambiguous' && <p className="font-semibold">{t('line.ambiguous')}</p>}
      <LineToFixHint reason={reason} isResolving={generator.isResolving} />
      {line?.status === 'ambiguous' && (
        <CandidateButtons
          candidates={line.candidates}
          onPick={(oracleId) => generator.pickCandidate(writtenIndex, oracleId)}
        />
      )}
    </div>
  );
}
