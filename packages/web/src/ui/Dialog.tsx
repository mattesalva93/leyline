// Owned dialog components on the Radix primitive (ADR 0010): Radix handles the focus trap,
// Escape, the focus given back and the screen-reader semantics; the look is ours.
import * as RadixDialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;
export const DialogTitle = RadixDialog.Title;

/** Radix keeps a closing part on the page until its exit animation ends. */
const FADES_IN_AND_OUT = 'data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out';

const OVERLAY = `fixed inset-0 z-40 bg-overlay ${FADES_IN_AND_OUT}`;

/**
 * Marks a field that Escape empties while it has text. Radix hears Escape before the field
 * does, so a panel that holds such a field leaves Escape to it rather than closing.
 */
export const ESCAPE_EMPTIES_FIELD = 'data-escape-empties-field';

function leaveEscapeToAFieldItEmpties(event: KeyboardEvent) {
  if (event.target instanceof Element && event.target.closest(`[${ESCAPE_EMPTIES_FIELD}]`)) {
    event.preventDefault();
  }
}

interface DialogContentProps {
  /** The dialog's accessible name, for a dialog whose title is not shown. */
  readonly ariaLabel?: string;
  readonly className?: string;
  readonly children: ReactNode;
}

/** How wide a centred window may grow: narrow for a short form, wide for a grid of cards. */
const CENTERED_DIALOG_MAX_WIDTH = { narrow: 'max-w-sm', wide: 'max-w-2xl' } as const;

/** A window in the middle of the screen, above a dimmed page. */
export function CenteredDialogContent({
  ariaLabel,
  className = '',
  width = 'narrow',
  children,
}: DialogContentProps & { readonly width?: keyof typeof CENTERED_DIALOG_MAX_WIDTH }) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className={OVERLAY} />
      <RadixDialog.Content
        aria-label={ariaLabel}
        aria-describedby={undefined}
        className={`fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] ${CENTERED_DIALOG_MAX_WIDTH[width]} -translate-x-1/2 -translate-y-1/2 ${FADES_IN_AND_OUT} rounded-lg border-2 border-border bg-panel p-5 text-sm text-foreground shadow-[4px_4px_0_var(--color-border)] ${className}`}
      >
        {children}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

/** A panel that slides in from the left edge, full height, as a phone menu does. */
export function SideDrawerContent({ ariaLabel, className = '', children }: DialogContentProps) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className={OVERLAY} />
      <RadixDialog.Content
        aria-label={ariaLabel}
        aria-describedby={undefined}
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col gap-1 border-r-2 border-border bg-panel p-4 font-sans text-foreground data-[state=open]:animate-slide-in-from-left data-[state=closed]:animate-slide-out-to-left ${className}`}
      >
        {children}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

/** A panel over the whole screen that rises from the bottom, as a phone shows a step of its own. */
export function FullScreenPanelContent({
  ariaLabel,
  className = '',
  onCloseAutoFocus,
  children,
}: DialogContentProps & {
  /** Where the focus goes as the panel closes, for a panel opened by no trigger to give it back to. */
  readonly onCloseAutoFocus?: (event: Event) => void;
}) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Content
        aria-label={ariaLabel}
        aria-describedby={undefined}
        onCloseAutoFocus={onCloseAutoFocus}
        onEscapeKeyDown={leaveEscapeToAFieldItEmpties}
        className={`fixed inset-x-0 top-0 z-50 flex h-dvh flex-col bg-panel font-sans text-foreground data-[state=open]:animate-slide-in-from-bottom data-[state=closed]:animate-slide-out-to-bottom ${className}`}
      >
        {children}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}
