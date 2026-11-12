import { describe, expect, it } from 'vitest';
import {
  ZOOMED_CARD_GAP_PX,
  ZOOMED_CARD_PX,
  zoomedCardPlacement,
} from './zoomed-card-placement.ts';

const VIEWPORT = { width: 1600, height: 900 };

/** A box on screen, from its left and top edges and its size. */
function box(left: number, top: number, width: number, height: number) {
  return { left, top, right: left + width, bottom: top + height };
}

describe('the place of the zoomed card', () => {
  it('stands to the right of what it is beside, when the screen has room there', () => {
    const tile = box(100, 300, 150, 210);

    const placement = zoomedCardPlacement({ hovered: tile, beside: tile, viewport: VIEWPORT });

    expect(placement?.left).toBe(250 + ZOOMED_CARD_GAP_PX);
  });

  it('goes to the left when the right has no room for it', () => {
    const tile = box(1400, 300, 150, 210);

    const placement = zoomedCardPlacement({ hovered: tile, beside: tile, viewport: VIEWPORT });

    expect(placement?.left).toBe(1400 - ZOOMED_CARD_GAP_PX - ZOOMED_CARD_PX.width);
  });

  it('never covers what it is beside: with room on neither side it is not shown', () => {
    const picker = box(200, 0, 1200, 900);

    const placement = zoomedCardPlacement({
      hovered: box(600, 300, 100, 140),
      beside: picker,
      viewport: VIEWPORT,
    });

    expect(placement).toBeNull();
  });

  it('stands beside the whole of what it is beside, not just the hovered card', () => {
    const picker = box(1200, 0, 340, 900);

    const placement = zoomedCardPlacement({
      hovered: box(1300, 300, 100, 140),
      beside: picker,
      viewport: VIEWPORT,
    });

    expect(placement?.left).toBe(1200 - ZOOMED_CARD_GAP_PX - ZOOMED_CARD_PX.width);
  });

  it('centres on the hovered card in height', () => {
    const tile = box(100, 400, 100, 140);

    const placement = zoomedCardPlacement({ hovered: tile, beside: tile, viewport: VIEWPORT });

    expect(placement?.top).toBe(470 - ZOOMED_CARD_PX.height / 2);
  });

  it('stays inside the screen when the hovered card is near its top or bottom', () => {
    const nearTop = box(100, 0, 100, 140);
    const nearBottom = box(100, 800, 100, 100);

    const top = zoomedCardPlacement({ hovered: nearTop, beside: nearTop, viewport: VIEWPORT });
    const bottom = zoomedCardPlacement({
      hovered: nearBottom,
      beside: nearBottom,
      viewport: VIEWPORT,
    });

    expect(top?.top).toBe(ZOOMED_CARD_GAP_PX);
    expect(bottom?.top).toBe(900 - ZOOMED_CARD_GAP_PX - ZOOMED_CARD_PX.height);
  });
});
