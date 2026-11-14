import { cardCornersOfBoxWiderBy } from '../card-shape.ts';
import { copyPileReachPx } from './CopyPile.tsx';
import { FOCUS_LINE_STYLE, SHOWN_ON_FOCUSED_TILE } from './focus-line.ts';

interface FocusedTileOutlineProps {
  /** The copies of the tile, whose pile the outline surrounds with the card. */
  readonly copies: number;
}

/**
 * The line that marks a print tile as the focused tile: one line around its card and the copies
 * its pile draws, leaving out its tab and its set and number. It shows on keyboard focus only,
 * never after a click.
 */
export function FocusedTileOutline({ copies }: FocusedTileOutlineProps) {
  const pileReachPx = copyPileReachPx(copies);
  return (
    <span
      data-focus-outline
      aria-hidden="true"
      className={`pointer-events-none absolute ${SHOWN_ON_FOCUSED_TILE}`}
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
