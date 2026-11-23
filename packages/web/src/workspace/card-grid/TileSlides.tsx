import { Component, type ReactNode, type RefObject } from 'react';
import { slidesBetween, type PlacedTile } from './tile-slides.ts';

const SLIDE_KEY_ATTRIBUTE = 'data-slide-key';
const SLIDE_FROM_X = '--slide-from-x';
const SLIDE_FROM_Y = '--slide-from-y';

/** What makes a cell of the card grid slide into its place as the grid reorders. */
export function slidingTileProps(slideKey: string) {
  return { [SLIDE_KEY_ATTRIBUTE]: slideKey, className: 'animate-slide-into-place' };
}

function slidingTilesIn(grid: HTMLElement): HTMLElement[] {
  return [...grid.querySelectorAll<HTMLElement>(`[${SLIDE_KEY_ATTRIBUTE}]`)];
}

/** Where each sliding tile in `grid` stands now, as the page shows it: midway through a slide too. */
function placesIn(grid: HTMLElement): PlacedTile[] {
  return slidingTilesIn(grid).map((tile) => {
    const { left, top } = tile.getBoundingClientRect();
    return { slideKey: tile.getAttribute(SLIDE_KEY_ATTRIBUTE) ?? '', left, top };
  });
}

/**
 * Plays the slide of each of `tiles` again from its start, which its `--slide-from-*` now set. A
 * slide that has ended is gone from the page's animations, so it is taken off and put back, with
 * one layout in between for all.
 */
function replaySlides(grid: HTMLElement, tiles: readonly HTMLElement[]) {
  for (const tile of tiles) tile.style.animationName = 'none';
  // Reading a size lays the page out, which the browser needs to see the animation taken off.
  void grid.offsetWidth;
  for (const tile of tiles) tile.style.removeProperty('animation-name');
}

interface TileSlidesProps {
  /** The card grid, whose cells marked by `slidingTileProps` slide. */
  readonly grid: RefObject<HTMLElement | null>;
  /** The slide keys of the grid's cells in the order it shows them. */
  readonly slideKeys: readonly string[];
  readonly children: ReactNode;
}

/**
 * Slides the tiles of the card grid into their new places as the grid reorders, from where each
 * stood, so the eye follows a card to where it went. The theme's keyframes carry the motion, and
 * reduced motion takes it away. A class: only `getSnapshotBeforeUpdate` reads the page before
 * React changes it, and that is where a tile still stands where it was.
 */
export class TileSlides extends Component<TileSlidesProps> {
  override getSnapshotBeforeUpdate(previous: TileSlidesProps): PlacedTile[] | null {
    const grid = this.props.grid.current;
    // Only a new order makes anything slide: the grid is not measured on any other update.
    const isNewOrder = previous.slideKeys.join(' ') !== this.props.slideKeys.join(' ');
    return grid && isNewOrder ? placesIn(grid) : null;
  }

  override componentDidUpdate(
    _previous: TileSlidesProps,
    _state: unknown,
    before: PlacedTile[] | null,
  ) {
    const grid = this.props.grid.current;
    if (!grid || !before) return;
    const tiles = slidingTilesIn(grid);
    // A slide still under way stops, so each tile is measured in its own place.
    for (const tile of tiles) {
      tile.style.removeProperty(SLIDE_FROM_X);
      tile.style.removeProperty(SLIDE_FROM_Y);
    }
    const tileBySlideKey = new Map(
      tiles.map((tile) => [tile.getAttribute(SLIDE_KEY_ATTRIBUTE), tile]),
    );
    const slidingTiles = slidesBetween(before, placesIn(grid)).flatMap(
      ({ slideKey, fromX, fromY }) => {
        const tile = tileBySlideKey.get(slideKey);
        if (!tile) return [];
        tile.style.setProperty(SLIDE_FROM_X, `${fromX}px`);
        tile.style.setProperty(SLIDE_FROM_Y, `${fromY}px`);
        return [tile];
      },
    );
    replaySlides(grid, slidingTiles);
  }

  override render() {
    return this.props.children;
  }
}
