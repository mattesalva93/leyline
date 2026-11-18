import type { ReactNode } from 'react';
import { pileFreeTileFrame } from './CopyPile.tsx';
import { TILE_TAB_HEIGHT_CSS } from './tile-tab-geometry.ts';

/** The frame of a tile without a pile of copies: its card lines up with a print's. */
export function PileFreeTileFrame({ children }: { readonly children: ReactNode }) {
  return <div style={pileFreeTileFrame(TILE_TAB_HEIGHT_CSS)}>{children}</div>;
}
