// Class lists the design board repeats across its zones: ink borders and hard shadows.

export const HARD_SHADOW = 'shadow-[4px_4px_0_var(--color-border)]';

/** The hard shadow cast by a shape and what stands out of it, such as a bubble and its arrow. */
export const HARD_DROP_SHADOW = 'drop-shadow-[4px_4px_0_var(--color-border)]';

/** The hard shadow of a pressed button, cut by the 2 px it sank, so its far edge stays put. */
const HALF_SUNK_HARD_SHADOW = 'not-disabled:active:shadow-[2px_2px_0_var(--color-border)]';

/** A panel lying on the board: the decklist, the inspector. */
export const BOARD_PANEL = `rounded-lg border-2 border-border bg-panel ${HARD_SHADOW}`;

/** Small capitals in the monospace face: panel titles and short labels. */
export const LABEL = 'font-mono text-[11px] font-bold tracking-widest uppercase';

/** Pressed, a button sinks into the board, the way a drawing-board key gives under the finger. */
export const SINKS_WHEN_PRESSED =
  'not-disabled:active:translate-x-0.5 not-disabled:active:translate-y-0.5';

/** Under the pointer a control turns to the accent; pressed it sinks; disabled it does neither. */
export const BUTTON_STATES = `not-disabled:hover:bg-accent not-disabled:hover:text-accent-foreground ${SINKS_WHEN_PRESSED}`;

/**
 * Pressed, a control's content sinks while the control stays put: for a control placed by its own
 * translate, such as `-translate-y-1/2`, which a translate of its own on press would replace.
 */
export const SINKS_WITH_PRESSED_GROUP = 'group-active:translate-x-0.5 group-active:translate-y-0.5';

/** Pressed, a control's content sinks straight down: for content that already moves sideways on hover. */
export const SINKS_DOWN_WITH_PRESSED_GROUP = 'group-active:translate-y-0.5';

/**
 * Under the pointer a button rises 2 px off the board, its hard shadow stretched by as much, so
 * its far edge stays put: the mirror of the press, which it gives way to. Only where motion is
 * welcome.
 */
const RISES_UNDER_POINTER =
  'motion-safe:not-disabled:not-active:hover:-translate-x-0.5 motion-safe:not-disabled:not-active:hover:-translate-y-0.5 motion-safe:not-disabled:not-active:hover:shadow-[6px_6px_0_var(--color-border)]';

/**
 * Eases the rise and the colour under the pointer; the press itself answers at once, while the
 * release eases back.
 */
const EASES_UNDER_POINTER =
  'transition-[translate,box-shadow,background-color] not-disabled:active:transition-none';

/**
 * The main action of a zone, in the accent colour. Under the pointer it darkens a little and
 * rises; pressed, it sinks halfway into its shadow.
 */
export const PRIMARY_BUTTON = `flex items-center gap-2 rounded-md border-2 border-border bg-accent px-5 py-2 font-bold text-accent-foreground not-disabled:hover:bg-accent-hover disabled:opacity-50 ${HARD_SHADOW} ${RISES_UNDER_POINTER} ${SINKS_WHEN_PRESSED} ${HALF_SUNK_HARD_SHADOW} ${EASES_UNDER_POINTER}`;

/** A plain bordered button. */
export const SECONDARY_BUTTON = `rounded-md border-2 border-border bg-panel px-3 py-1.5 font-semibold disabled:opacity-40 ${BUTTON_STATES}`;

/** A small square button holding a symbol, such as − or +. */
export const SYMBOL_BUTTON = `grid size-8 place-items-center rounded-sm border-2 border-border bg-panel font-mono font-bold leading-none disabled:opacity-40 ${BUTTON_STATES}`;

/** A text field or a select. */
export const FIELD =
  'min-h-9 rounded-md border-2 border-border bg-panel px-2 py-1 text-foreground invalid:border-warning';
