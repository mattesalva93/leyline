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
export type GuideBubbleSide = 'right' | 'bottom';

/**
 * The drawing turned to point back at the control, in the box it then fills: up for a bubble
 * below its control, left for a bubble on its right.
 */
const TURNED: Readonly<
  Record<
    GuideBubbleSide,
    { readonly transform: string; readonly width: number; readonly height: number }
  >
> = {
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
};

/** Across the bubble's edge, how far the tip lies from the start of the arrow's box. */
const TIP_ACROSS = DRAWING.tip.x * SCALE;
/** Out from the bubble's edge, how far the base lies from the far side of the arrow's box. */
const BASE_OUT = (DRAWING.height - DRAWING.baseY) * SCALE;

/**
 * The hand-drawn arrow of a guided step's bubble, standing out of the bubble's edge facing the
 * control, `GUIDE_ARROW_INSET_PX` from that edge's start.
 */
export function GuideArrow({ side }: { readonly side: GuideBubbleSide }) {
  const turned = TURNED[side];
  const box =
    side === 'bottom'
      ? { left: GUIDE_ARROW_INSET_PX - TIP_ACROSS, top: -BASE_OUT }
      : { top: GUIDE_ARROW_INSET_PX - TIP_ACROSS, left: -BASE_OUT };
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${turned.width} ${turned.height}`}
      width={turned.width * SCALE}
      height={turned.height * SCALE}
      className="pointer-events-none absolute overflow-visible"
      style={box}
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
