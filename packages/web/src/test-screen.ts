import { COARSE_POINTER_QUERY } from './pdf-delivery.ts';
import { WIDE_SCREEN_QUERY } from './screen-size.ts';

/** What the screen under test is like. */
interface TestScreen {
  readonly isWide: boolean;
  readonly touchIsMain: boolean;
}

/**
 * Makes `matchMedia` answer as `screen` does, since jsdom has no media queries. `resize` then
 * changes its width and tells the page, as a browser window does.
 */
export function stubScreen(screen: TestScreen) {
  let current = screen;
  const onChange = new Set<() => void>();
  window.matchMedia = (query) =>
    ({
      get matches() {
        if (query === WIDE_SCREEN_QUERY) return current.isWide;
        return query === COARSE_POINTER_QUERY && current.touchIsMain;
      },
      media: query,
      addEventListener: (_type: string, listener: () => void) => onChange.add(listener),
      removeEventListener: (_type: string, listener: () => void) => onChange.delete(listener),
    }) as never;
  return {
    resize(isWide: boolean) {
      current = { ...current, isWide };
      onChange.forEach((listener) => listener());
    },
  };
}

/** A wide desktop screen, where a mouse is the main input: the screen tests run on by default. */
export const DESKTOP: TestScreen = { isWide: true, touchIsMain: false };

/** A narrow screen with touch as the main input. */
export const PHONE: TestScreen = { isWide: false, touchIsMain: true };
