import type { CSSProperties } from 'react';

/** The arrow as drawn, pointing down out of a bubble above it: its base on the bubble's edge. */
const DRAWING = {
  width: 44,
  height: 48,
  baseY: 2,
  tip: { x: 22, y: 46 },
  strokes: ['M32,2 C41,17 35,38 22,46', 'M22,46 L25,36', 'M22,46 L32,43'],
} as const;

/** How much bigger than its drawing the arrow shows. */
const SCALE = 1.7;

/** From the bubble's edge to the tip of its arrow, in CSS px. */
export const GUIDE_ARROW_LENGTH_PX = (DRAWING.tip.y - DRAWING.baseY) * SCALE;

/** Where the arrow leaves the bubble, from the start of the bubble's edge, in CSS px. */
export const GUIDE_ARROW_INSET_PX = 40;

/** The side of its control a bubble stands on: the arrow points back from it. */
export type GuideBubbleSide = 'top' | 'right' | 'bottom' | 'left';

/** Which end of the bubble's edge facing the control its arrow leaves from. */
export type GuideBubbleAlign = 'start' | 'end';

/**
 * The drawing turned to point back at the control, in the box it then fills: down for a bubble
 * above its control, up for one below, left for one on its right, right for one on its left.
 */
const TURNED: Readonly<
  Record<
    GuideBubbleSide,
    { readonly transform: string; readonly width: number; readonly height: number }
  >
> = {
  top: { transform: '', width: DRAWING.width, height: DRAWING.height },
  bottom: {
    transform: `rotate(180 ${DRAWING.width / 2} ${DRAWING.height / 2})`,
    width: DRAWING.width,
    height: DRAWING.height,
  },
  right: {
    transform: `translate(${DRAWING.height} 0) rotate(90)`,
    width: DRAWING.height,
    height: DRAWING.width,
  },
  left: {
    transform: `translate(0 ${DRAWING.width}) rotate(-90)`,
    width: DRAWING.height,
    height: DRAWING.width,
  },
};

/** Across the bubble's edge, how far the tip lies from the start of the arrow's box. */
const TIP_ACROSS = DRAWING.tip.x * SCALE;
/** Out from the bubble's edge, how far the base lies from the far side of the arrow's box. */
const BASE_OUT = (DRAWING.height - DRAWING.baseY) * SCALE;

/** The two ends of the bubble's edge on `side`, as CSS sides: where `start` and `end` lie. */
const EDGE_ENDS: Readonly<Record<GuideBubbleSide, Readonly<Record<GuideBubbleAlign, string>>>> = {
  top: { start: 'left', end: 'right' },
  bottom: { start: 'left', end: 'right' },
  right: { start: 'top', end: 'bottom' },
  left: { start: 'top', end: 'bottom' },
};

/** The bubble's edge facing the control, as a CSS side. */
const FACING_EDGE: Readonly<Record<GuideBubbleSide, string>> = {
  top: 'bottom',
  bottom: 'top',
  right: 'left',
  left: 'right',
};

/**
 * Where the arrow's box stands in the bubble: out of the edge facing the control, its tip
 * `GUIDE_ARROW_INSET_PX` from the end `align` of that edge. The drawing is symmetric across its
 * tip, so either end measures the same.
 */
function arrowBox(side: GuideBubbleSide, align: GuideBubbleAlign): CSSProperties {
  return {
    [EDGE_ENDS[side][align]]: GUIDE_ARROW_INSET_PX - TIP_ACROSS,
    [FACING_EDGE[side]]: -BASE_OUT,
  };
}

/**
 * The hand-drawn arrow of a guided step's bubble, standing out of the bubble's edge facing the
 * control, `GUIDE_ARROW_INSET_PX` from that edge's end `align`.
 */
export function GuideArrow({
  side,
  align,
}: {
  readonly side: GuideBubbleSide;
  readonly align: GuideBubbleAlign;
}) {
  const turned = TURNED[side];
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${turned.width} ${turned.height}`}
      width={turned.width * SCALE}
      height={turned.height * SCALE}
      className="pointer-events-none absolute overflow-visible"
      style={arrowBox(side, align)}
    >
      <g
        transform={turned.transform}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth={2.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {DRAWING.strokes.map((stroke) => (
          <path key={stroke} d={stroke} vectorEffect="non-scaling-stroke" />
        ))}
      </g>
    </svg>
  );
}
