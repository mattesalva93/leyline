import type { CSSProperties } from 'react';
import { CARD_SHAPE } from '../card-shape.ts';

/** The most copies a pile draws: past it, a tile of more copies looks the same. */
const MAX_COPIES = 5;
/** How far each copy sits down and right of the one in front of it, in CSS px. */
const COPY_STEP_PX = 4;

/**
 * The room every tile of the card grid leaves right of and below its card, in CSS px: the
 * deepest pile fits in it, so cards line up whatever their copies.
 */
export const COPY_PILE_FOOTPRINT_PX = MAX_COPIES * COPY_STEP_PX;

/**
 * The room a tile without a pile leaves beside its card, below the tab height `tabHeightPx`, so
 * its card lines up with a print's.
 */
export function pileFreeTileFrame(tabHeightPx: number): CSSProperties {
  return {
    paddingTop: tabHeightPx,
    paddingRight: COPY_PILE_FOOTPRINT_PX,
    paddingBottom: COPY_PILE_FOOTPRINT_PX,
  };
}

/** How many copies the pile of a tile holding `copies` copies draws. */
export function copyPileCopyCount(copies: number): number {
  return Math.min(Math.max(copies - 1, 0), MAX_COPIES);
}

interface CopyPileProps {
  readonly copies: number;
  /** The image of the face the tile's card shows. */
  readonly imageUrl: string | undefined;
  /** The colour of the card's ring, when it has one: the copies wear a thinner one. */
  readonly ringColour: string | undefined;
}

/**
 * The copies of the card drawn behind a tile's card, one per copy beyond the first, so a tile of
 * many copies reads as a pile. Their outlines stay outside the image (ADR 0007): the ring's
 * colour, or the background's so that the black borders of two copies do not merge.
 */
export function CopyPile({ copies, imageUrl, ringColour }: CopyPileProps) {
  return Array.from({ length: copyPileCopyCount(copies) }, (_, index) => {
    const offset = (index + 1) * COPY_STEP_PX;
    return (
      <span
        key={index}
        data-copy-pile-copy
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-raised"
        style={{
          ...CARD_SHAPE,
          transform: `translate(${offset}px, ${offset}px)`,
          boxShadow: `0 0 0 1px ${ringColour ?? 'var(--color-pile-thread)'}`,
        }}
      >
        {imageUrl && (
          <img
            className="block w-full"
            style={CARD_SHAPE}
            src={imageUrl}
            alt=""
            draggable={false}
          />
        )}
      </span>
    );
  }).toReversed();
}
