import { useState } from 'react';

/** The narrowest a tile gets in the card grid, in CSS px, as the tile width slider sets it. */
export const TILE_WIDTH_PX = { min: 110, max: 280, step: 10, default: 150 } as const;

const STORAGE_KEY = 'mtg-suite.tileWidth';

function isTileWidth(value: number): boolean {
  return Number.isFinite(value) && value >= TILE_WIDTH_PX.min && value <= TILE_WIDTH_PX.max;
}

function loadTileWidth(): number {
  try {
    const stored = Number(localStorage.getItem(STORAGE_KEY) ?? Number.NaN);
    return isTileWidth(stored) ? stored : TILE_WIDTH_PX.default;
  } catch {
    // Storage can be blocked (private windows, site data off): the tiles start at their default.
    return TILE_WIDTH_PX.default;
  }
}

function saveTileWidth(width: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(width));
  } catch {
    // Not remembered across visits; the slider still works for this one.
  }
}

/** The tile width the user picked with the tile width slider, remembered on the device. */
export function useTileWidth(): readonly [number, (width: number) => void] {
  const [width, setWidth] = useState(loadTileWidth);
  const pick = (next: number) => {
    if (!isTileWidth(next)) return;
    setWidth(next);
    saveTileWidth(next);
  };
  return [width, pick];
}
