import type { Lang } from '@mtg-suite/core';
import { useTranslation } from 'react-i18next';
import { SECONDARY_BUTTON } from '../../ui/board-styles.ts';
import { Icon } from '../../ui/Icon.tsx';
import { CandidateCarousel } from './CandidateCarousel.tsx';
import { lineNameOf, type ImagelessGridTile } from './grid-tiles.ts';
import { LineToFixHint } from '../line-to-fix/LineToFixHint.tsx';
import { RemoveLineButton } from '../line-to-fix/RemoveLineButton.tsx';
import { PileFreeTileFrame } from './PileFreeTileFrame.tsx';
import { CARD_SHAPE } from '../card-image/card-shape.ts';
import { FOCUS_LINE_STYLE, SHOWN_ON_FOCUSED_TILE } from './focus-line.ts';
import { cardRingsShadow } from './tile-rings.ts';

interface ImagelessTileProps {
  readonly gridTile: ImagelessGridTile;
  readonly isResolving: boolean;
  readonly isSelected: boolean;
  /** The card language, which an ambiguous line's candidates name their keywords in. */
  readonly lang: Lang;
  /** Opens the line's panel: only a resolved line has one. */
  readonly onSelect: () => void;
  readonly onPickCandidate: (oracleId: string) => void;
  /** Takes the line out of the decklist text. */
  readonly onRemove: () => void;
}

/**
 * The tile of a line with no print to show: it says what is wrong, as the line is written, and
 * offers the way out when there is one. Its buttons are for the pointer: Tab stops on the tile,
 * and Enter opens the line's panel, which offers the same ways out.
 */
export function ImagelessTile({
  gridTile,
  isResolving,
  isSelected,
  lang,
  onSelect,
  onPickCandidate,
  onRemove,
}: ImagelessTileProps) {
  const { t } = useTranslation();
  const { reason, line, writtenLine } = gridTile;
  // The candidates fill the tile above the remove button: they say what is wrong themselves.
  const candidates = line?.status === 'ambiguous' ? line.candidates : null;
  return (
    <PileFreeTileFrame>
      <div
        style={{
          ...CARD_SHAPE,
          ...FOCUS_LINE_STYLE,
          boxShadow: cardRingsShadow({ hasSiblings: false, isSelected }),
        }}
        className={`${SHOWN_ON_FOCUSED_TILE} flex w-full flex-col gap-1.5 overflow-hidden border-2 border-dashed p-2 text-xs ${reason === 'pending' ? 'border-border bg-panel/70' : 'border-danger bg-panel'}`}
      >
        {candidates ? (
          <CandidateCarousel
            candidates={candidates}
            lang={lang}
            isInGridCell
            onPick={onPickCandidate}
          />
        ) : (
          <>
            {reason !== 'pending' && (
              <p className="flex items-center gap-1 font-semibold text-danger">
                <Icon name="warning" className="size-3.5" />
                {t(`tile.imageless.${reason}`)}
              </p>
            )}
            <p className="font-mono break-words">{writtenLine.trim()}</p>
            <LineToFixHint reason={reason} isResolving={isResolving} />
          </>
        )}
        {reason === 'noPrint' && line?.status === 'resolved' && (
          <button
            type="button"
            tabIndex={-1}
            className={`${SECONDARY_BUTTON} mt-auto px-2 py-1 text-xs`}
            aria-pressed={isSelected}
            onClick={onSelect}
          >
            {t('tile.open', { name: line.card.name })}
          </button>
        )}
        {reason !== 'pending' && (
          <RemoveLineButton
            lineName={lineNameOf(gridTile)}
            isInGridCell
            className={`${reason === 'noPrint' || candidates ? '' : 'mt-auto'} px-2 py-1 text-xs`}
            onRemove={onRemove}
          />
        )}
      </div>
    </PileFreeTileFrame>
  );
}
