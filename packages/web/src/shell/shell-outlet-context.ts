import { useOutletContext } from 'react-router';
import type { Theme } from './theme-choice.ts';

/** What the shell hands the area it shows. */
export interface ShellOutletContext {
  /** The place the area may fill in the top bar; `null` until the top bar is on screen. */
  readonly topBarSlot: HTMLElement | null;
  /** The theme the page is in, for what an area cannot colour with the theme's tokens. */
  readonly theme: Theme;
}

/** What the shell hands the current area, read from inside that area. */
export function useShellOutletContext(): ShellOutletContext {
  return useOutletContext<ShellOutletContext>();
}
