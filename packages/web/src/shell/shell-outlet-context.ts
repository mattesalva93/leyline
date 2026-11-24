import { useOutletContext } from 'react-router';
import type { GuideOnDevice } from '../workspace/guide/use-guide-on-device.ts';

/** What the shell hands the area it shows. */
export interface ShellOutletContext {
  /** The place the area may fill in the top bar; `null` until the top bar is on screen. */
  readonly topBarSlot: HTMLElement | null;
  /** The guide, which the shell's menu switches off and starts over. */
  readonly guideOnDevice: GuideOnDevice;
}

/** What the shell hands the current area, read from inside that area. */
export function useShellOutletContext(): ShellOutletContext {
  return useOutletContext<ShellOutletContext>();
}
