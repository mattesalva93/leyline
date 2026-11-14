import type { LineSide } from '@mtg-suite/core';
import { useTranslation } from 'react-i18next';
import { COPY_PILE_FOOTPRINT_PX } from './CopyPile.tsx';
import { TILE_GAP_PX, TILE_TAB_HEIGHT_PX } from './PrintTileCard.tsx';
import type { TileCellProps } from './tile-cell.ts';
import { GRID_CELL_FOCUS_GROUP } from './tile-rings.ts';
import type { TileDragHandlers } from './use-line-drag.ts';

/** How wide the bar showing where a dragged line lands is, in CSS px. */
const DROP_MARK_WIDTH_PX = 4;
/** The space between two cards: the gap between tiles and the pile's room right of the left one. */
const SPACE_BETWEEN_CARDS_PX = TILE_GAP_PX + COPY_PILE_FOOTPRINT_PX;
/** The bar stands in the middle of the space between two cards, before or after this tile's card. */
const DROP_MARK_OFFSET_PX = {
  before: -(SPACE_BETWEEN_CARDS_PX + DROP_MARK_WIDTH_PX) / 2,
  after: COPY_PILE_FOOTPRINT_PX - (SPACE_BETWEEN_CARDS_PX + DROP_MARK_WIDTH_PX) / 2,
};

interface ReorderableTileItemProps {
  readonly cell: TileCellProps;
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
 * drag to move its line in the decklist, with the bar that shows where a dragged line lands when it lands by this tile.
 */
export function ReorderableTileItem({
  cell,
  isSelected,
  dragHandlers,
  isDragged,
  dropMarkSide,
  children,
}: ReorderableTileItemProps) {
  const { t } = useTranslation();
  return (
    <li
      {...cell}
      className={`relative min-w-0 ${GRID_CELL_FOCUS_GROUP} ${dragHandlers ? 'cursor-grab active:cursor-grabbing' : ''} ${isDragged ? 'opacity-40' : ''}`}
      aria-current={isSelected || undefined}
      draggable={dragHandlers !== null || undefined}
      {...dragHandlers}
    >
      {children}
      {dropMarkSide && (
        <span
          role="separator"
          aria-label={t('workspace.dropMark')}
          className="absolute bottom-0 z-20 rounded-full bg-accent"
          style={{
            // Beside the card, below its tab.
            top: TILE_TAB_HEIGHT_PX,
            width: DROP_MARK_WIDTH_PX,
            [dropMarkSide === 'before' ? 'left' : 'right']: DROP_MARK_OFFSET_PX[dropMarkSide],
          }}
        />
      )}
    </li>
  );
}
