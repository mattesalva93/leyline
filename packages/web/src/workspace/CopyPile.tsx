import { CARD_SHAPE } from '../card-shape.ts';

/** The most edges a pile draws: past it, a tile of more copies looks the same. */
const MAX_EDGES = 5;
/** How far each edge sits down and right of the one above it, in CSS px. */
const EDGE_STEP_PX = 4;

/** How far below its card the deepest pile reaches, in CSS px: room to leave under a tile. */
export const COPY_PILE_MAX_DEPTH_PX = MAX_EDGES * EDGE_STEP_PX;

/** How many edges the pile of a tile holding `copies` copies draws. */
export function copyPileEdgeCount(copies: number): number {
  return Math.min(Math.max(copies - 1, 0), MAX_EDGES);
}

/**
 * The card edges drawn under a tile's card, one per copy beyond the first, so a tile of many
 * copies reads as a pile. It sits behind the card, all of it outside the image (ADR 0007).
 */
export function CopyPile({ copies }: { readonly copies: number }) {
  return Array.from({ length: copyPileEdgeCount(copies) }, (_, index) => {
    const offset = (index + 1) * EDGE_STEP_PX;
    return (
      <span
        key={index}
        data-copy-pile-edge
        aria-hidden="true"
        className="absolute inset-0 border-[1.5px] border-border bg-raised"
        style={{ ...CARD_SHAPE, transform: `translate(${offset}px, ${offset}px)` }}
      />
    );
  }).toReversed();
}
