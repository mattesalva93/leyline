import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { setAndNumberOf } from '../print-label.ts';
import { NORMAL_IMAGE } from '../scryfall-image-sizes.ts';
import { Icon } from '../ui/Icon.tsx';
import type { ZoomOn } from '../use-zoomed-card.tsx';
import type { PrintGridTile } from './grid-tiles.ts';
import { CARD_SHAPE } from '../card-shape.ts';
import { COPY_PILE_MAX_DEPTH_PX, CopyPile, copyPileEdgeCount } from './CopyPile.tsx';

/** The space between two tiles in a row, which the link between siblings spans, in CSS px. */
export const TILE_GAP_PX = 22;

/** The height of the tab above a tile's card, which an imageless tile leaves empty, in CSS px. */
export const TILE_TAB_HEIGHT_PX = 28;

const LINK_BRIDGE = 'absolute top-1/2 z-10 h-3 -translate-y-1/2 bg-link';

/** The space between the deepest pile and the line under the card, in CSS px. */
const GAP_UNDER_PILE_PX = 4;
/** The space between a tile's card and the line under it, the same with a pile or without. */
const BELOW_CARD_PX = COPY_PILE_MAX_DEPTH_PX + GAP_UNDER_PILE_PX;

/**
 * The card's shadow, all of it outside the image (ADR 0007): the ring of the selected tile or of
 * a tile with siblings, then the hard shadow of the board, which a pile under the card stands in for.
 */
function cardShadow(hasSiblings: boolean, isSelected: boolean, hasPile: boolean): string {
  const ring = isSelected
    ? ['0 0 0 4px var(--color-accent)']
    : hasSiblings
      ? ['0 0 0 3px var(--color-link)']
      : [];
  return [...ring, ...(hasPile ? [] : ['4px 4px 0 var(--color-border)'])].join(', ') || 'none';
}

interface PrintTileCardProps {
  readonly gridTile: PrintGridTile;
  readonly isSelected: boolean;
  /** The tile starts a row while its previous sibling ends the row above. */
  readonly continuesRowAbove: boolean;
  /** Zooms the card the tile shows once the pointer rests on it. */
  readonly zoomOn: ZoomOn;
  readonly onSelect: () => void;
  /** Gives the tile `quantity` copies of its print; at zero the tile goes. */
  readonly onQuantityChange: (quantity: number) => void;
}

const QUANTITY_BUTTON =
  'size-6 rounded-t-md font-mono text-sm font-bold text-panel hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-accent';

/**
 * One `PrintTile` in the card grid: the quantity, with a minus and a plus, on a tab above the
 * card, beside a flip button if its print is double-faced and the mark of its print's warning if it
 * has one, the card on its pile, and under it
 * its set and, among siblings, which of them it is. Siblings are linked by a bridge across the gap
 * to the next one, and by a joint on the row's edge when the next one wraps.
 */
export function PrintTileCard({
  gridTile,
  isSelected,
  continuesRowAbove,
  zoomOn,
  onSelect,
  onQuantityChange,
}: PrintTileCardProps) {
  const { t } = useTranslation();
  const { line, tile, siblingIndex, siblingCount } = gridTile;
  const hasSiblings = siblingCount > 1;
  const isLastSibling = siblingIndex === siblingCount - 1;
  const [isFlipped, setIsFlipped] = useState(false);
  const [frontFace, backFace] = tile.print.faces;
  const shownFace = (isFlipped && backFace) || frontFace;
  const warningLabel = tile.warning && t(`tile.printWarning.${tile.warning}`);
  const tabColour = hasSiblings ? 'bg-link' : 'bg-foreground';
  const hasPile = copyPileEdgeCount(tile.quantity) > 0;
  const quantityLabel = { name: line.card.name, print: setAndNumberOf(tile.print, t) };
  return (
    <div className="relative">
      <div className="flex items-end pl-2" style={{ height: TILE_TAB_HEIGHT_PX }}>
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
        {backFace && frontFace && (
          <button
            type="button"
            className="ml-1 grid size-6 place-items-center rounded-t-md bg-foreground text-panel hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-accent"
            aria-label={t('tile.flip', { name: frontFace.name })}
            aria-pressed={isFlipped}
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <Icon name="flip" className="size-3.5" />
          </button>
        )}
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
      <div className="relative">
        <CopyPile copies={tile.quantity} />
        <button
          type="button"
          aria-label={t('tile.open', { name: line.card.name })}
          aria-pressed={isSelected}
          className="relative z-10 block w-full bg-raised focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-accent"
          style={{ ...CARD_SHAPE, boxShadow: cardShadow(hasSiblings, isSelected, hasPile) }}
          onClick={onSelect}
          {...zoomOn(shownFace)}
        >
          {shownFace && (
            <img
              className="block w-full"
              style={CARD_SHAPE}
              src={shownFace.imageUris.normal}
              alt={t('line.imageAlt', { name: shownFace.name })}
              width={NORMAL_IMAGE.width}
              height={NORMAL_IMAGE.height}
              loading="lazy"
              draggable={false}
            />
          )}
        </button>
      </div>
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
      <p
        className="flex justify-between gap-2 font-mono text-[11px] text-muted-foreground"
        style={{ marginTop: BELOW_CARD_PX }}
      >
        <span className="truncate">{setAndNumberOf(tile.print, t)}</span>
        {hasSiblings && (
          <span className="font-bold text-link">
            {t('tile.siblingMark', { index: siblingIndex + 1, count: siblingCount })}
          </span>
        )}
      </p>
    </div>
  );
}
