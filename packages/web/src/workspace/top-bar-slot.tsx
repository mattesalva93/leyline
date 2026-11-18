import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useShellOutletContext } from '../shell/shell-outlet-context.ts';

/** Shows `children` in the shell's top bar, on the far right, from inside the current area. */
export function InTopBar({ children }: { readonly children: ReactNode }) {
  const { topBarSlot } = useShellOutletContext();
  return topBarSlot && createPortal(children, topBarSlot);
}
