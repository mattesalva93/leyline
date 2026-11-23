// Class lists the design board repeats across its zones: ink borders and hard shadows.

export const HARD_SHADOW = 'shadow-[4px_4px_0_var(--color-border)]';

/** A panel lying on the board: the decklist, the inspector. */
export const BOARD_PANEL = `rounded-lg border-2 border-border bg-panel ${HARD_SHADOW}`;

/** Small capitals in the monospace face: panel titles and short labels. */
export const LABEL = 'font-mono text-[11px] font-bold tracking-widest uppercase';

/** Pressed, a button sinks into the board, the way a drawing-board key gives under the finger. */
export const PRESSED = 'not-disabled:active:translate-x-0.5 not-disabled:active:translate-y-0.5';

/** Under the pointer a control turns to the accent; pressed it sinks; disabled it does neither. */
export const BUTTON_STATES = `not-disabled:hover:bg-accent not-disabled:hover:text-accent-foreground ${PRESSED}`;

/** Pressed, a control's content sinks while the control stays put: for one its own translate places. */
export const SINKS_WITH_PRESSED_GROUP = 'group-active:translate-x-0.5 group-active:translate-y-0.5';

/** The main action of a zone, in the accent colour. Pressed, it sinks halfway into its shadow. */
export const PRIMARY_BUTTON = `flex items-center gap-2 rounded-md border-2 border-border bg-accent px-5 py-2 font-bold text-accent-foreground not-disabled:hover:bg-accent-hover disabled:opacity-50 ${HARD_SHADOW} ${PRESSED} not-disabled:active:shadow-[2px_2px_0_var(--color-border)]`;

/** A plain bordered button. */
export const SECONDARY_BUTTON = `rounded-md border-2 border-border bg-panel px-3 py-1.5 font-semibold disabled:opacity-40 ${BUTTON_STATES}`;

/** A small square button holding a symbol, such as − or +. */
export const SYMBOL_BUTTON = `grid size-8 place-items-center rounded-sm border-2 border-border bg-panel font-mono font-bold leading-none disabled:opacity-40 ${BUTTON_STATES}`;

/** A text field or a select. */
export const FIELD =
  'min-h-9 rounded-md border-2 border-border bg-panel px-2 py-1 text-foreground invalid:border-warning';
