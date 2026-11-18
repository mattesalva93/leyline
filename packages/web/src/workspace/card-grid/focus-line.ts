// The line that marks the focused tile of the card grid: past a clear gap beyond every ring of
// its card, so it never moves as the tile is selected or split. It shows on keyboard focus only.
import { RINGS_REACH_PX } from './tile-rings.ts';

/** The clear space between the outermost ring and the focus line, in CSS px. */
const FOCUS_GAP_PX = 3;
/** The width of the focus line, in CSS px. */
const FOCUS_LINE_PX = 2;

/** How far the focus line reaches past the box it surrounds, in CSS px. */
export const FOCUS_REACH_PX = RINGS_REACH_PX + FOCUS_GAP_PX + FOCUS_LINE_PX;

/** The focus line around a box, drawn once one of the classes below gives it a style. */
export const FOCUS_LINE_STYLE = {
  outlineWidth: FOCUS_LINE_PX,
  outlineOffset: RINGS_REACH_PX + FOCUS_GAP_PX,
  outlineColor: 'var(--color-focus)',
} as const;

/** A cell of the card grid: it takes the keyboard focus and lets its tile draw the line. */
export const GRID_CELL_FOCUS_GROUP = 'group/grid-cell outline-none';

/** Shows the focus line of an element inside a grid cell while that cell is the focused tile. */
export const SHOWN_ON_FOCUSED_TILE = 'group-focus-visible/grid-cell:outline-solid';

/** Shows the focus line of a tile that is a grid cell itself, while it is the focused tile. */
export const SHOWN_ON_OWN_FOCUS = 'outline-none focus-visible:outline-solid';
