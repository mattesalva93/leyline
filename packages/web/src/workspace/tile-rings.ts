// The marks around a tile of the card grid, from its card outward: the sibling group's colour,
// the selection and its edge, a gap, then the keyboard focus. They add up instead of replacing
// each other, so a tile shows every state it is in.

/** The ring in the colour of the tile's sibling group, in CSS px. */
const SIBLING_RING_PX = 2;
/** The accent ring of the selected tile, in CSS px. */
const SELECTION_RING_PX = 3;
/** The edge around the selection ring that parts it from the board, in CSS px. */
const SELECTION_EDGE_PX = 1;

/** Which marks a tile's card wears. */
export interface CardRingStates {
  readonly hasSiblings: boolean;
  readonly isSelected: boolean;
}

/**
 * The rings around a card, as a `box-shadow`, all of them outside the image (ADR 0007). A card
 * with no ring keeps a thread of the background that parts its border from the pile's.
 */
export function cardRingsShadow({ hasSiblings, isSelected }: CardRingStates): string {
  const siblingPx = hasSiblings ? SIBLING_RING_PX : 0;
  const rings = [
    ...(hasSiblings ? [ring(siblingPx, 'var(--sibling-colour)')] : []),
    ...(isSelected
      ? [
          ring(siblingPx + SELECTION_RING_PX, 'var(--color-accent)'),
          ring(siblingPx + SELECTION_RING_PX + SELECTION_EDGE_PX, 'var(--color-selection-edge)'),
        ]
      : []),
  ];
  return rings.length > 0 ? rings.join(', ') : ring(1, 'var(--color-pile-thread)');
}

function ring(reachPx: number, colour: string): string {
  return `0 0 0 ${reachPx}px ${colour}`;
}

/** How far the rings of a sibling, selected tile reach past its card, in CSS px. */
const RINGS_REACH_PX = SIBLING_RING_PX + SELECTION_RING_PX + SELECTION_EDGE_PX;
/** The clear space between the outermost ring and the focus line, in CSS px. */
const FOCUS_GAP_PX = 3;
/** The keyboard focus line, in CSS px. */
const FOCUS_LINE_PX = 2;

/**
 * How far the focus line reaches past the box it surrounds, in CSS px. It stands past every ring
 * whatever rings the tile wears, so it never moves as the tile is selected or split.
 */
export const FOCUS_REACH_PX = RINGS_REACH_PX + FOCUS_GAP_PX + FOCUS_LINE_PX;

/** The focus line around a box, drawn once a class such as `SHOWN_ON_GRID_CELL_FOCUS` gives it a style. */
export const FOCUS_LINE_STYLE = {
  outlineWidth: FOCUS_LINE_PX,
  outlineOffset: RINGS_REACH_PX + FOCUS_GAP_PX,
  outlineColor: 'var(--color-focus)',
} as const;

/** A cell of the card grid: it takes the keyboard focus and lets its tile draw it. */
export const GRID_CELL_FOCUS_GROUP = 'group/grid-cell outline-none';

/** Shows the focus line of an element inside a grid cell while the keyboard stands on the cell. */
export const SHOWN_ON_GRID_CELL_FOCUS = 'group-focus-visible/grid-cell:outline-solid';
