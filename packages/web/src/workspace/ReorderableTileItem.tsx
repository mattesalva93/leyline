import type { LineSide } from '@mtg-suite/core';
import { useTranslation } from 'react-i18next';
import { TILE_GAP_PX } from './PrintTileCard.tsx';
import type { TileDragHandlers } from './use-line-drag.ts';

/** How wide the bar showing where a dragged line lands is, in CSS px. */
const DROP_MARK_WIDTH_PX = 4;
/** The bar stands in the middle of the gap between two tiles. */
const DROP_MARK_OFFSET_PX = -(TILE_GAP_PX + DROP_MARK_WIDTH_PX) / 2;

interface ReorderableTileItemProps {
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
 * One tile of the card grid as a list item the mouse can drag to move its line in the decklist,
 * with the bar that shows where a dragged line lands when it lands by this tile.
 */
export function ReorderableTileItem({
  isSelected,
  dragHandlers,
  isDragged,
  dropMarkSide,
  children,
}: ReorderableTileItemProps) {
  const { t } = useTranslation();
  return (
    <li
      className={`relative min-w-0 ${dragHandlers ? 'cursor-grab active:cursor-grabbing' : ''} ${isDragged ? 'opacity-40' : ''}`}
      aria-current={isSelected || undefined}
      draggable={dragHandlers !== null || undefined}
      {...dragHandlers}
    >
      {children}
      {dropMarkSide && (
        <span
          role="separator"
          aria-label={t('workspace.dropMark')}
          className="absolute top-7 bottom-0 z-20 rounded-full bg-accent"
          style={{
            width: DROP_MARK_WIDTH_PX,
            [dropMarkSide === 'before' ? 'left' : 'right']: DROP_MARK_OFFSET_PX,
          }}
        />
      )}
    </li>
  );
}
