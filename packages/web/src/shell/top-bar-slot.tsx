import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext } from 'react-router';

/** What the shell hands the area it shows: the place the area may fill in the top bar. */
export interface ShellOutletContext {
  /** `null` until the top bar is on screen. */
  readonly topBarSlot: HTMLElement | null;
}

/** Shows `children` in the shell's top bar, on the far right, from inside the current area. */
export function InTopBar({ children }: { readonly children: ReactNode }) {
  const { topBarSlot } = useOutletContext<ShellOutletContext>();
  return topBarSlot && createPortal(children, topBarSlot);
}
