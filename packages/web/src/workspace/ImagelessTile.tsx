import { useTranslation } from 'react-i18next';
import { SECONDARY_BUTTON } from '../ui/board-styles.ts';
import { Icon } from '../ui/Icon.tsx';
import type { ImagelessGridTile } from './grid-tiles.ts';

interface ImagelessTileProps {
  readonly gridTile: ImagelessGridTile;
  readonly isResolving: boolean;
  readonly isSelected: boolean;
  /** Opens the line's panel: only a resolved line has one. */
  readonly onSelect: () => void;
  readonly onPickCandidate: (oracleId: string) => void;
}

/**
 * The tile of a line with no print to show: it says what is wrong, as the line is written, and
 * offers the way out when there is one.
 */
export function ImagelessTile({
  gridTile,
  isResolving,
  isSelected,
  onSelect,
  onPickCandidate,
}: ImagelessTileProps) {
  const { t } = useTranslation();
  const { reason, line, writtenLine } = gridTile;
  return (
    <li className="min-w-0 pt-7">
      <div
        className={`flex card-shape flex-col gap-1.5 overflow-hidden border-2 border-dashed p-2 text-xs ${reason === 'pending' ? 'border-border bg-panel/70' : 'border-danger bg-panel'} ${isSelected ? 'outline-4 outline-offset-4 outline-accent' : ''}`}
      >
        {reason !== 'pending' && (
          <p className="flex items-center gap-1 font-semibold text-danger">
            <Icon name="warning" className="size-3.5" />
            {t(`tile.imageless.${reason}`)}
          </p>
        )}
        <p className="font-mono break-words">{writtenLine.trim()}</p>
        {reason === 'pending' && (
          <p className="text-muted-foreground">
            {isResolving ? t('decklist.resolving') : t('line.pending')}
          </p>
        )}
        {reason === 'notFound' && <p className="text-muted-foreground">{t('line.notFound')}</p>}
        {line?.status === 'ambiguous' && (
          <div className="flex min-h-0 flex-col gap-1 overflow-y-auto">
            {line.candidates.map(({ card }) => (
              <button
                key={card.oracleId}
                type="button"
                className={`${SECONDARY_BUTTON} px-2 py-1 text-left text-xs`}
                onClick={() => onPickCandidate(card.oracleId)}
              >
                {card.name}
              </button>
            ))}
          </div>
        )}
        {reason === 'noPrint' && line?.status === 'resolved' && (
          <button
            type="button"
            className={`${SECONDARY_BUTTON} mt-auto px-2 py-1 text-xs`}
            aria-pressed={isSelected}
            onClick={onSelect}
          >
            {t('tile.open', { name: line.card.name })}
          </button>
        )}
      </div>
    </li>
  );
}
