import {
  SIDE_PANEL_WIDTH_PX,
  type SidePanelLayout,
  type SidePanelName,
} from './side-panel-layout.ts';

/**
 * The narrowest the centre of the workspace gets, in CSS px, as long as the side panels can
 * narrow to make room for it.
 */
export const CENTRE_MIN_WIDTH_PX = 320;

/** A side panel as the screen has room for it: how wide it is shown, and how wide it may get. */
export interface FittedSidePanel {
  readonly width: number;
  readonly maxWidth: number;
}

const SIDE_PANELS: readonly SidePanelName[] = ['decklist', 'inspector'];

/**
 * The side panels fitted into `room`, the CSS px the open ones have between them. Too wide
 * together, each open panel gives up its share of the excess, in proportion to how much it can
 * give before its narrowest. With `room` unknown, each panel keeps its own width.
 */
export function fitSidePanels(
  layouts: Readonly<Record<SidePanelName, SidePanelLayout>>,
  room: number | null,
): Readonly<Record<SidePanelName, FittedSidePanel>> {
  const open = SIDE_PANELS.filter((panel) => layouts[panel].isOpen);
  const slack = (panel: SidePanelName) => layouts[panel].width - SIDE_PANEL_WIDTH_PX[panel].min;
  const excess =
    room === null ? 0 : open.reduce((sum, panel) => sum + layouts[panel].width, 0) - room;
  const totalSlack = open.reduce((sum, panel) => sum + slack(panel), 0);
  const shownWidth = (panel: SidePanelName) => {
    if (excess <= 0 || !layouts[panel].isOpen) return layouts[panel].width;
    const given = totalSlack === 0 ? 0 : Math.min(1, excess / totalSlack) * slack(panel);
    return Math.floor(layouts[panel].width - given);
  };
  const shown = Object.fromEntries(
    SIDE_PANELS.map((panel) => [panel, shownWidth(panel)]),
  ) as Record<SidePanelName, number>;
  const maxWidth = (panel: SidePanelName) => {
    const { min, max } = SIDE_PANEL_WIDTH_PX[panel];
    if (room === null) return max;
    const others = open
      .filter((other) => other !== panel)
      .reduce((sum, other) => sum + shown[other], 0);
    return Math.min(max, Math.max(min, room - others));
  };
  return Object.fromEntries(
    SIDE_PANELS.map((panel) => [panel, { width: shown[panel], maxWidth: maxWidth(panel) }]),
  ) as Record<SidePanelName, FittedSidePanel>;
}
