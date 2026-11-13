/** The side panels of the workspace on a wide screen. */
export type SidePanelName = 'decklist' | 'inspector';

/** How wide each side panel gets in CSS px, as dragging its edge sets it. */
export const SIDE_PANEL_WIDTH_PX = {
  decklist: { min: 190, max: 420, default: 240 },
  inspector: { min: 280, max: 520, default: 340 },
} as const satisfies Record<SidePanelName, { min: number; max: number; default: number }>;

/** How far one press of an arrow key moves a side panel's edge, in CSS px. */
export const SIDE_PANEL_KEY_STEP_PX = 20;

/** `width` brought within the narrowest and the widest `panel` gets. */
export function clampSidePanelWidth(panel: SidePanelName, width: number): number {
  const { min, max } = SIDE_PANEL_WIDTH_PX[panel];
  return Math.min(max, Math.max(min, width));
}

/**
 * The narrowest the centre of the workspace gets, in CSS px. A screen too narrow for it and both
 * side panels at their width narrows the panels instead, down to their narrowest, which a wide
 * screen always has room for.
 */
export const CENTRE_MIN_WIDTH_PX = 320;
