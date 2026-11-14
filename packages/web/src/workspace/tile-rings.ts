// The rings around a tile's card, from the card outward: the sibling group's colour, then the
// selection and its edge. They add up instead of replacing each other, so a tile shows every
// state it is in. The focused tile's outline stands past them (see focus-line.ts).

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
export const RINGS_REACH_PX = SIBLING_RING_PX + SELECTION_RING_PX + SELECTION_EDGE_PX;
