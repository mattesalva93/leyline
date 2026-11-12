import { LARGE_IMAGE } from './scryfall-image-sizes.ts';

/** A box on screen, in CSS px from the viewport's top left corner. */
export interface ScreenBox {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** The zoomed card's size on screen: wide enough to read its text, in CSS px. */
export const ZOOMED_CARD_PX = {
  width: 380,
  height: (380 * LARGE_IMAGE.height) / LARGE_IMAGE.width,
} as const;

/** The space the zoomed card keeps from what it stands beside and from the screen's edges. */
export const ZOOMED_CARD_GAP_PX = 20;

interface ZoomedCardPlacementInput {
  /** The card the pointer rests on: the zoomed card centres on it in height. */
  readonly hovered: ScreenBox;
  /** What the zoomed card must not cover, such as the tile or the whole print picker. */
  readonly beside: ScreenBox;
  readonly viewport: { readonly width: number; readonly height: number };
}

/**
 * Where the zoomed card goes: to the right of `beside`, or to its left when the right has no
 * room, so it hides nothing the user compares it with. With room on neither side it covers
 * `beside` rather than leave the screen.
 */
export function zoomedCardPlacement({ hovered, beside, viewport }: ZoomedCardPlacementInput): {
  readonly left: number;
  readonly top: number;
} {
  const { width, height } = ZOOMED_CARD_PX;
  const onTheRight = beside.right + ZOOMED_CARD_GAP_PX;
  const onTheLeft = beside.left - ZOOMED_CARD_GAP_PX - width;
  const left =
    onTheRight + width <= viewport.width
      ? onTheRight
      : Math.max(
          ZOOMED_CARD_GAP_PX,
          Math.min(onTheLeft, viewport.width - ZOOMED_CARD_GAP_PX - width),
        );
  const centred = (hovered.top + hovered.bottom) / 2 - height / 2;
  const lowest = viewport.height - ZOOMED_CARD_GAP_PX - height;
  return { left, top: Math.max(ZOOMED_CARD_GAP_PX, Math.min(centred, lowest)) };
}
