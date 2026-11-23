import type { LineSide } from '@mtg-suite/core';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { COPY_PILE_FOOTPRINT_PX } from './CopyPile.tsx';
import { TILE_GAP_PX } from './PrintTileCard.tsx';
import { TILE_TAB_HEIGHT_CSS } from './tile-tab-geometry.ts';
import type { TileCellProps } from './tile-cell.ts';
import { GRID_CELL_FOCUS_GROUP } from './focus-line.ts';
import type { TileDragHandlers } from './use-line-drag.ts';
import { slidingTileProps } from './TileSlides.tsx';

/** How wide the bar showing where a dragged line lands is, in CSS px. */
const DROP_MARK_WIDTH_PX = 4;
/** The space between two cards: the gap between tiles and the pile's room right of the left one. */
const SPACE_BETWEEN_CARDS_PX = TILE_GAP_PX + COPY_PILE_FOOTPRINT_PX;
/** The bar stands in the middle of the space between two cards, before or after this tile's card. */
const DROP_MARK_OFFSET_PX = {
  before: -(SPACE_BETWEEN_CARDS_PX + DROP_MARK_WIDTH_PX) / 2,
  after: COPY_PILE_FOOTPRINT_PX - (SPACE_BETWEEN_CARDS_PX + DROP_MARK_WIDTH_PX) / 2,
};

/**
 * A grabbed tile shows it, over its card too: the card's button, marked `data-tile-image-button`,
 * would otherwise keep the theme's hand. Marked by the tile rather than read from `:active`, which
 * Chrome leaves on a tile after a drag until the pointer moves again.
 */
const GRABBING_HAND_WHEN_GRABBED =
  'data-grabbed:cursor-grabbing data-grabbed:[&_[data-tile-image-button]]:cursor-grabbing';

interface ReorderableTileItemProps {
  readonly cell: TileCellProps;
  /** Names the tile by the card it shows, so it slides from where that card stood. */
  readonly slideKey: string;
  readonly isSelected: boolean;
  /** `null` where touch is the main input: there the order changes in the text alone. */
  readonly dragHandlers: TileDragHandlers | null;
  /** Its line is the one being dragged. */
  readonly isDragged: boolean;
  /** The side of the tile where the dragged line lands, if it lands by it. */
  readonly dropMarkSide: LineSide | null;
  readonly children: React.ReactNode;
}

/**
 * One tile of the card grid as a list item: the cell the keyboard focuses, which the mouse can
 * drag to move its line in the decklist, with the bar that shows where a dragged line lands when
 * it lands by this tile. It slides into its new place as the grid reorders.
 */
export function ReorderableTileItem({
  cell,
  slideKey,
  isSelected,
  dragHandlers,
  isDragged,
  dropMarkSide,
  children,
}: ReorderableTileItemProps) {
  const { t } = useTranslation();
  const [isGrabbed, setIsGrabbed] = useState(false);
  const letGo = () => setIsGrabbed(false);
  const sliding = slidingTileProps(slideKey);
  return (
    <li
      {...cell}
      {...sliding}
      className={`relative min-w-0 ${sliding.className} ${GRID_CELL_FOCUS_GROUP} ${dragHandlers ? GRABBING_HAND_WHEN_GRABBED : ''} ${isDragged ? 'opacity-40' : ''}`}
      aria-current={isSelected || undefined}
      draggable={dragHandlers !== null || undefined}
      data-grabbed={isGrabbed || undefined}
      {...dragHandlers}
      {...(dragHandlers && {
        onPointerDown: () => setIsGrabbed(true),
        onPointerUp: letGo,
        onPointerCancel: letGo,
        onDragEnd: () => {
          letGo();
          dragHandlers.onDragEnd();
        },
      })}
    >
      {children}
      {dropMarkSide && (
        <span
          role="separator"
          aria-label={t('workspace.dropMark')}
          className="absolute bottom-0 z-20 rounded-full bg-accent"
          style={{
            // Beside the card, below its tab.
            top: TILE_TAB_HEIGHT_CSS,
            width: DROP_MARK_WIDTH_PX,
            [dropMarkSide === 'before' ? 'left' : 'right']: DROP_MARK_OFFSET_PX[dropMarkSide],
          }}
        />
      )}
    </li>
  );
}
