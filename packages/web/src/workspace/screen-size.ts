import { useSyncExternalStore } from 'react';

/** The width from which the workspace's zones stand side by side: Tailwind's `lg`. */
export const WIDE_SCREEN_QUERY = '(min-width: 64rem)';

function subscribe(onChange: () => void) {
  const query = window.matchMedia(WIDE_SCREEN_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/** Whether the screen is wide enough for the zones side by side, kept up as the window resizes. */
export function useIsWideScreen(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(WIDE_SCREEN_QUERY).matches);
}
