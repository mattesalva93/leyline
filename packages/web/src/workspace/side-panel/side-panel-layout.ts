import { useEffect, useState } from 'react';

/** The side panels of the workspace on a wide screen. */
export type SidePanelName = 'decklist' | 'inspector';

/**
 * The side of a side panel that faces the centre of the workspace (the card grid or the sheet),
 * where its tab and its resize handle are.
 */
export type CentreSide = 'left' | 'right';

/** Where each side panel faces the centre: the decklist lies left of it, the inspector right. */
export const CENTRE_SIDE = {
  decklist: 'right',
  inspector: 'left',
} as const satisfies Record<SidePanelName, CentreSide>;

/** The narrowest, the widest and the usual width of a side panel, in CSS px. */
export interface SidePanelWidthLimits {
  readonly min: number;
  readonly max: number;
  readonly default: number;
}

/** How wide each side panel gets, as dragging its edge sets it. */
export const SIDE_PANEL_WIDTH_PX = {
  decklist: { min: 190, max: 420, default: 240 },
  inspector: { min: 280, max: 520, default: 340 },
} as const satisfies Record<SidePanelName, SidePanelWidthLimits>;

/** How far one press of an arrow key moves a side panel's edge, in CSS px. */
export const SIDE_PANEL_KEY_STEP_PX = 20;

/** `width` brought within the narrowest and the widest `panel` gets. */
function clampSidePanelWidth(panel: SidePanelName, width: number): number {
  const { min, max } = SIDE_PANEL_WIDTH_PX[panel];
  return Math.min(max, Math.max(min, width));
}

/** How the user left a side panel: folded down to a strip or open, and how wide while open. */
export interface SidePanelLayout {
  readonly isOpen: boolean;
  readonly width: number;
}

/** Raised whenever the saved shape changes: a layout of any other version is left unread. */
const SAVED_LAYOUT_VERSION = 1;

function storageKey(panel: SidePanelName): string {
  return `mtg-suite.sidePanel.${panel}`;
}

function defaultLayout(panel: SidePanelName): SidePanelLayout {
  return { isOpen: true, width: SIDE_PANEL_WIDTH_PX[panel].default };
}

function isLayoutOf(panel: SidePanelName, value: unknown): value is SidePanelLayout {
  if (typeof value !== 'object' || value === null) return false;
  const { version, isOpen, width } = value as Record<string, unknown>;
  return (
    version === SAVED_LAYOUT_VERSION &&
    typeof isOpen === 'boolean' &&
    typeof width === 'number' &&
    clampSidePanelWidth(panel, width) === width
  );
}

function loadLayout(panel: SidePanelName): SidePanelLayout {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(storageKey(panel)) ?? 'null');
    return isLayoutOf(panel, stored)
      ? { isOpen: stored.isOpen, width: stored.width }
      : defaultLayout(panel);
  } catch {
    // Unreadable, or storage blocked (private windows, site data off): the panel starts as usual.
    return defaultLayout(panel);
  }
}

function saveLayout(panel: SidePanelName, layout: SidePanelLayout): void {
  try {
    localStorage.setItem(
      storageKey(panel),
      JSON.stringify({ version: SAVED_LAYOUT_VERSION, ...layout }),
    );
  } catch {
    // Not remembered across visits; the panel still folds and resizes for this one.
  }
}

/** A side panel as the user left it, with the ways to fold it or open it and to resize it. */
export interface SidePanelControls extends SidePanelLayout {
  readonly toggle: () => void;
  /** Sets the panel's width, brought within its limits. */
  readonly resize: (width: number) => void;
}

/** How the user left side panel `panel`, remembered on the device. */
export function useSidePanelLayout(panel: SidePanelName): SidePanelControls {
  const [layout, setLayout] = useState(() => loadLayout(panel));
  useEffect(() => saveLayout(panel, layout), [panel, layout]);
  return {
    ...layout,
    toggle: () => setLayout((current) => ({ ...current, isOpen: !current.isOpen })),
    resize: (width) =>
      setLayout((current) => ({ ...current, width: clampSidePanelWidth(panel, width) })),
  };
}
