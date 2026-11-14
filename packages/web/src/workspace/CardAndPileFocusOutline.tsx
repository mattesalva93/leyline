import { cardCornersOfBoxWiderBy } from '../card-shape.ts';
import { copyPileReachPx } from './CopyPile.tsx';
import { FOCUS_LINE_STYLE, SHOWN_ON_GRID_CELL_FOCUS } from './tile-rings.ts';

interface CardAndPileFocusOutlineProps {
  /** The copies of the tile, whose pile the outline surrounds with the card. */
  readonly copies: number;
}

/**
 * The keyboard focus of a tile of the card grid: one line around its card and the copies its
 * pile draws, leaving out its tab and the line under it. It shows while the keyboard stands on
 * the tile's cell, never after a click.
 */
export function CardAndPileFocusOutline({ copies }: CardAndPileFocusOutlineProps) {
  const pileReachPx = copyPileReachPx(copies);
  return (
    <span
      data-focus-outline
      aria-hidden="true"
      className={`pointer-events-none absolute ${SHOWN_ON_GRID_CELL_FOCUS}`}
      style={{
        top: 0,
        left: 0,
        right: -pileReachPx,
        bottom: -pileReachPx,
        borderRadius: cardCornersOfBoxWiderBy(pileReachPx),
        ...FOCUS_LINE_STYLE,
      }}
    />
  );
}
