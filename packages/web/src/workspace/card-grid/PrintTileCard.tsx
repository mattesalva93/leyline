import { printedBackFace } from '@mtg-suite/core';
import { useTranslation } from 'react-i18next';
import { setAndNumberOf } from '../card-image/print-label.ts';
import { NORMAL_IMAGE } from '../card-image/scryfall-image-sizes.ts';
import type { ZoomOn } from '../zoomed-card/use-zoomed-card.tsx';
import type { PrintGridTile } from './grid-tiles.ts';
import { CARD_SHAPE } from '../card-image/card-shape.ts';
import { COPY_PILE_FOOTPRINT_PX, CopyPile } from './CopyPile.tsx';
import { siblingColourStyle } from './sibling-group-colours.ts';
import { FOCUS_REACH_PX } from './focus-line.ts';
import { FocusedTileOutline } from './FocusedTileOutline.tsx';
import { cardRingsShadow, type CardRingStates } from './tile-rings.ts';
import { TileTab } from './TileTab.tsx';
import type { TileTabRows } from './tile-tab-geometry.ts';
import { SINKS_WHEN_PRESSED } from '../../ui/board-styles.ts';
import { FadingInImage } from '../card-image/FadingInImage.tsx';

/** The space between two tiles in a row, which the link between siblings spans, in CSS px. */
export const TILE_GAP_PX = 22;

const LINK_BRIDGE = 'absolute top-1/2 z-10 h-3 -translate-y-1/2 bg-(--sibling-colour)';

/** The space between the focus line around the deepest pile and the set and number under the card, in CSS px. */
const SPACE_ABOVE_SET_AND_NUMBER_PX = 3;
/** The space between a tile's card and the set and number under it, the same with a pile or without. */
const BELOW_CARD_PX = COPY_PILE_FOOTPRINT_PX + FOCUS_REACH_PX + SPACE_ABOVE_SET_AND_NUMBER_PX;

/** What a card with no ring wears: a thread of the background that parts its border from the pile's. */
const THREAD_OF_A_CARD_WITHOUT_RINGS = '0 0 0 1px var(--color-pile-thread)';

/** The colour of the thin ring the pile's copies wear: the outermost colour of the card's rings. */
function pileRingColourOf({ hasSiblings, isSelected }: CardRingStates): string | undefined {
  if (isSelected) return 'var(--color-accent)';
  return hasSiblings ? 'var(--sibling-colour)' : undefined;
}

interface PrintTileCardProps {
  readonly gridTile: PrintGridTile;
  /** The colour of the tile's sibling group: `undefined` for a tile without siblings. */
  readonly siblingColour: string | undefined;
  readonly isSelected: boolean;
  /** The rows the tile's tab takes, the same for every tile of its grid. */
  readonly tabRows: TileTabRows;
  /** Whether the tile shows the back face of its double-faced card. */
  readonly isFlipped: boolean;
  readonly onFlip: () => void;
  /** The tile starts a row while its previous sibling ends the row above. */
  readonly continuesRowAbove: boolean;
  /** Zooms the card the tile shows once the pointer rests on it. */
  readonly zoomOn: ZoomOn;
  readonly onSelect: () => void;
  /** Gives the tile `quantity` copies of its print; at zero the tile goes. */
  readonly onQuantityChange: (quantity: number) => void;
}

/**
 * One `PrintTile` in the card grid: its `TileTab` above the card, the card on its pile, and under
 * it its set and, among siblings, which of them it is. Siblings share their group's colour and
 * are linked by a bridge across the gap to the next one, and by a joint on the row's edge when
 * the next one wraps.
 */
export function PrintTileCard({
  gridTile,
  siblingColour,
  isSelected,
  tabRows,
  isFlipped,
  onFlip,
  continuesRowAbove,
  zoomOn,
  onSelect,
  onQuantityChange,
}: PrintTileCardProps) {
  const { t } = useTranslation();
  const { line, tile, siblingIndex, siblingCount } = gridTile;
  const hasSiblings = siblingCount > 1;
  const isLastSibling = siblingIndex === siblingCount - 1;
  const frontFace = tile.print.faces[0];
  const backFace = printedBackFace(tile.print);
  const shownFace = (isFlipped && backFace) || frontFace;
  const warningLabel = tile.warning && t(`tile.printWarning.${tile.warning}`);
  const quantityColour = hasSiblings ? 'var(--sibling-colour)' : 'var(--color-foreground)';
  const ringStates = { hasSiblings, isSelected };
  const quantityLabel = { name: line.card.name, print: setAndNumberOf(tile.print, t) };
  return (
    <div
      className="relative"
      style={{
        paddingRight: COPY_PILE_FOOTPRINT_PX,
        ...(siblingColour === undefined ? undefined : siblingColourStyle(siblingColour)),
      }}
    >
      <TileTab
        rows={tabRows}
        quantityColour={quantityColour}
        quantity={{
          count: tile.quantity,
          decreaseLabel: t('tile.decrease', quantityLabel),
          increaseLabel: t('tile.increase', quantityLabel),
          onChange: onQuantityChange,
        }}
        flip={
          backFace && frontFace
            ? {
                label: t('tile.flip', { name: frontFace.name }),
                isFlipped,
                onFlip,
              }
            : null
        }
        warningLabel={warningLabel || null}
      />
      <div className="relative">
        <CopyPile
          copies={tile.quantity}
          imageUrl={shownFace?.imageUris.normal}
          ringColour={pileRingColourOf(ringStates)}
        />
        <button
          type="button"
          tabIndex={-1}
          data-tile-image-button
          aria-label={t('tile.open', { name: line.card.name })}
          aria-pressed={isSelected}
          className={`relative z-10 block w-full bg-raised ${SINKS_WHEN_PRESSED}`}
          style={{
            ...CARD_SHAPE,
            boxShadow: cardRingsShadow(ringStates) ?? THREAD_OF_A_CARD_WITHOUT_RINGS,
          }}
          onClick={onSelect}
          {...zoomOn(shownFace)}
        >
          {shownFace && (
            <FadingInImage
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
        <FocusedTileOutline copies={tile.quantity} />
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
          className={LINK_BRIDGE}
          // From the card's edge, over the pile's room and the gap, to the next sibling.
          style={{
            left: `calc(100% - ${COPY_PILE_FOOTPRINT_PX}px)`,
            width: COPY_PILE_FOOTPRINT_PX + TILE_GAP_PX,
          }}
        />
      )}
      <p
        className="flex justify-between gap-2 font-mono text-[11px] text-muted-foreground"
        style={{ marginTop: BELOW_CARD_PX }}
      >
        <span className="truncate">{setAndNumberOf(tile.print, t)}</span>
        {hasSiblings && (
          <span className="font-bold text-(--sibling-colour)">
            {t('tile.siblingMark', { index: siblingIndex + 1, count: siblingCount })}
          </span>
        )}
      </p>
    </div>
  );
}
