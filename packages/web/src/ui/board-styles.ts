// Class lists the design board repeats across its zones: ink borders and hard shadows.

export const HARD_SHADOW = 'shadow-[4px_4px_0_var(--color-border)]';

/** A panel lying on the board: the decklist, the inspector. */
export const BOARD_PANEL = `rounded-lg border-2 border-border bg-panel ${HARD_SHADOW}`;

/** Small capitals in the monospace face: panel titles and short labels. */
export const LABEL = 'font-mono text-[11px] font-bold tracking-widest uppercase';

/** The main action of a zone, in the accent colour. */
export const PRIMARY_BUTTON = `flex items-center gap-2 rounded-md border-2 border-border bg-accent px-5 py-2 font-bold text-accent-foreground disabled:opacity-50 ${HARD_SHADOW}`;

/** A plain bordered button. */
export const SECONDARY_BUTTON =
  'rounded-md border-2 border-border bg-panel px-3 py-1.5 font-semibold hover:bg-accent hover:text-accent-foreground disabled:opacity-40 disabled:hover:bg-panel disabled:hover:text-foreground';

/** A small square button holding a symbol, such as − or +. */
export const SYMBOL_BUTTON =
  'grid size-8 place-items-center rounded-sm border-2 border-border bg-panel font-mono font-bold leading-none hover:bg-accent hover:text-accent-foreground disabled:opacity-40 disabled:hover:bg-panel disabled:hover:text-foreground';

/** A text field or a select. */
export const FIELD =
  'min-h-9 rounded-md border-2 border-border bg-panel px-2 py-1 text-foreground invalid:border-warning';
