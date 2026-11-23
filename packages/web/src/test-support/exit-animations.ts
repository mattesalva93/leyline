import { fireEvent } from '@testing-library/react';
import { onTestFinished, vi } from 'vitest';

/** The states a Radix part that opens and closes takes, in its `data-state`. */
type OpenOrClosed = 'open' | 'closed';

function isOpenOrClosed(state: string | null): state is OpenOrClosed {
  return state === 'open' || state === 'closed';
}

/** The animation a Radix part runs in each state, as the theme's classes would give it. */
const ANIMATION_BY_STATE: Readonly<Record<OpenOrClosed, string>> = {
  open: 'test-enter',
  closed: 'test-exit',
};

/**
 * Makes each Radix part look animated, as the theme's stylesheet makes it in a browser: jsdom
 * loads no stylesheet, so without this a closing part leaves the page at once. A closing part
 * then stays until `endExitAnimation` is called on it. Lasts until the end of the test.
 */
export function animateRadixParts() {
  const realGetComputedStyle = window.getComputedStyle.bind(window);
  const spy = vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudoElement) => {
    const style = realGetComputedStyle(element, pseudoElement);
    // A getter, since a computed style is live: Radix reads it again once the part has closed.
    Object.defineProperty(style, 'animationName', {
      get: () => {
        const state = element.getAttribute('data-state');
        return isOpenOrClosed(state) ? ANIMATION_BY_STATE[state] : 'none';
      },
    });
    return style;
  });
  onTestFinished(() => spy.mockRestore());
}

/** Ends the exit animation of a closing part, as the browser does once it has played. */
export function endExitAnimation(part: Element) {
  // jsdom has no AnimationEvent, so the name the browser would carry is set by hand.
  const animationEnd = Object.assign(new Event('animationend', { bubbles: true }), {
    animationName: ANIMATION_BY_STATE.closed,
  });
  fireEvent(part, animationEnd);
}
