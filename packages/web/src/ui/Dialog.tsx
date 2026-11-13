// Owned dialog components on the Radix primitive (ADR 0010): Radix handles the focus trap,
// Escape, the focus given back and the screen-reader semantics; the look is ours.
import * as RadixDialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;
export const DialogTitle = RadixDialog.Title;

const OVERLAY = 'fixed inset-0 z-40 bg-overlay';

interface DialogContentProps {
  /** The dialog's accessible name, for a dialog whose title is not shown. */
  readonly ariaLabel?: string;
  readonly className?: string;
  readonly children: ReactNode;
}

/** A window in the middle of the screen, above a dimmed page. */
export function CenteredDialogContent({ ariaLabel, className = '', children }: DialogContentProps) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className={OVERLAY} />
      <RadixDialog.Content
        aria-label={ariaLabel}
        aria-describedby={undefined}
        className={`fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 border-border bg-panel p-5 text-sm text-foreground shadow-[4px_4px_0_var(--color-border)] ${className}`}
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
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col gap-1 border-r-2 border-border bg-panel p-4 font-sans text-foreground ${className}`}
      >
        {children}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

/** A panel that rises from the bottom edge of the screen, full width. */
export function BottomPanelContent({
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
      <RadixDialog.Overlay className={OVERLAY} />
      <RadixDialog.Content
        aria-label={ariaLabel}
        aria-describedby={undefined}
        onCloseAutoFocus={onCloseAutoFocus}
        className={`fixed inset-x-0 bottom-0 z-50 flex max-h-[78dvh] flex-col rounded-t-lg border-t-2 border-border bg-panel font-sans text-foreground ${className}`}
      >
        {children}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}
