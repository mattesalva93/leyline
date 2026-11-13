/** The side panels of the workspace on a wide screen. */
export type SidePanelName = 'decklist' | 'inspector';

/**
 * How wide each side panel gets in CSS px, as dragging its edge sets it. Even with both panels
 * at their widest, a wide screen keeps room for the card grid.
 */
export const SIDE_PANEL_WIDTH_PX = {
  decklist: { min: 190, max: 420, default: 240 },
  inspector: { min: 280, max: 520, default: 340 },
} as const satisfies Record<SidePanelName, { min: number; max: number; default: number }>;
