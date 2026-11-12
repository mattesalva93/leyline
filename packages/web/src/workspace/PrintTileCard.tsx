import { useTranslation } from 'react-i18next';
import { setAndNumberOf } from '../print-label.ts';
import { NORMAL_IMAGE } from '../scryfall-image-sizes.ts';
import { Icon } from '../ui/Icon.tsx';
import type { PrintGridTile } from './grid-tiles.ts';
import { CARD_SHAPE } from '../card-shape.ts';

/** The space between two tiles in a row, which the link between siblings spans, in CSS px. */
export const TILE_GAP_PX = 22;

const LINK_BRIDGE = 'absolute top-1/2 z-10 h-3 -translate-y-1/2 bg-link';

/**
 * The card's shadow, all of it outside the image (ADR 0007): the ring of the selected tile or of
 * a tile with siblings, then the hard shadow of the board.
 */
function cardShadow(hasSiblings: boolean, isSelected: boolean): string {
  const ring = isSelected
    ? ['0 0 0 4px var(--color-accent)']
    : hasSiblings
      ? ['0 0 0 3px var(--color-link)']
      : [];
  return [...ring, '4px 4px 0 var(--color-border)'].join(', ');
}

interface PrintTileCardProps {
  readonly gridTile: PrintGridTile;
  readonly isSelected: boolean;
  /** The tile starts a row while its previous sibling ends the row above. */
  readonly continuesRowAbove: boolean;
  readonly onSelect: () => void;
  /** Gives the tile `quantity` copies of its print; at zero the tile goes. */
  readonly onQuantityChange: (quantity: number) => void;
}

const QUANTITY_BUTTON =
  'size-6 rounded-t-md font-mono text-sm font-bold text-panel hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-accent';

/**
 * One `PrintTile` in the card grid: the quantity, with a minus and a plus, on a tab above the
 * card, beside the mark of its
 * print's warning if it has one, the card, and under it
 * its set and, among siblings, which of them it is. Siblings are linked by a bridge across the gap
 * to the next one, and by a joint on the row's edge when the next one wraps.
 */
export function PrintTileCard({
  gridTile,
  isSelected,
  continuesRowAbove,
  onSelect,
  onQuantityChange,
}: PrintTileCardProps) {
  const { t } = useTranslation();
  const { line, tile, siblingIndex, siblingCount } = gridTile;
  const hasSiblings = siblingCount > 1;
  const isLastSibling = siblingIndex === siblingCount - 1;
  const frontFace = tile.print.faces[0];
  const warningLabel = tile.warning && t(`tile.printWarning.${tile.warning}`);
  const tabColour = hasSiblings ? 'bg-link' : 'bg-foreground';
  const quantityLabel = { name: line.card.name, print: setAndNumberOf(tile.print, t) };
  return (
    <li className="relative min-w-0" aria-current={isSelected || undefined}>
      <div className="flex h-7 items-end pl-2">
        <div className={`flex items-center rounded-t-md ${tabColour}`}>
          <button
            type="button"
            className={QUANTITY_BUTTON}
            aria-label={t('tile.decrease', quantityLabel)}
            onClick={() => onQuantityChange(tile.quantity - 1)}
          >
            {t('panel.minus')}
          </button>
          <span className="px-1 py-0.5 font-mono text-sm font-bold text-panel tabular-nums">
            {t('line.quantity', { count: tile.quantity })}
          </span>
          <button
            type="button"
            className={QUANTITY_BUTTON}
            aria-label={t('tile.increase', quantityLabel)}
            onClick={() => onQuantityChange(tile.quantity + 1)}
          >
            {t('panel.plus')}
          </button>
        </div>
        {warningLabel && (
          // On the tab row above the card, so it never covers the artist or copyright line.
          <span
            role="img"
            aria-label={warningLabel}
            title={warningLabel}
            className="mr-2 ml-auto rounded-t-md bg-warning px-1.5 py-0.5 text-panel"
          >
            <Icon name="warning" />
          </span>
        )}
      </div>
      <button
        type="button"
        aria-label={t('tile.open', { name: line.card.name })}
        aria-pressed={isSelected}
        className="relative z-10 block w-full bg-raised focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-accent"
        style={{ ...CARD_SHAPE, boxShadow: cardShadow(hasSiblings, isSelected) }}
        onClick={onSelect}
      >
        {frontFace && (
          <img
            className="block w-full"
            style={CARD_SHAPE}
            src={frontFace.imageUris.normal}
            alt={t('line.imageAlt', { name: frontFace.name })}
            width={NORMAL_IMAGE.width}
            height={NORMAL_IMAGE.height}
            loading="lazy"
            draggable={false}
          />
        )}
      </button>
      {continuesRowAbove && (
        <span
          aria-hidden="true"
          className={`${LINK_BRIDGE} right-full`}
          style={{ width: TILE_GAP_PX }}
        />
      )}
      {hasSiblings && !isLastSibling && (
        <span
          aria-hidden="true"
          className={`${LINK_BRIDGE} left-full`}
          style={{ width: TILE_GAP_PX }}
        />
      )}
      <p className="mt-2 flex justify-between gap-2 font-mono text-[11px] text-muted-foreground">
        <span className="truncate">{setAndNumberOf(tile.print, t)}</span>
        {hasSiblings && (
          <span className="font-bold text-link">
            {t('tile.siblingMark', { index: siblingIndex + 1, count: siblingCount })}
          </span>
        )}
      </p>
    </li>
  );
}
