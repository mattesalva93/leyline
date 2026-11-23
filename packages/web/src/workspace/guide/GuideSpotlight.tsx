import { useEffect, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { boardPanelHolding } from '../../ui/BoardPanel.tsx';

const SPOTLIT_ATTRIBUTE = 'data-guide-spotlight';

/** Marks an element the spotlight of the guide leaves lit and clickable. */
export const GUIDE_SPOTLIT = { [SPOTLIT_ATTRIBUTE]: '' } as const;

/**
 * How far the light reaches past a spotlit element, in CSS px: out past one standing free, clear
 * of its controls' hard shadows; in from the edges of one inside a board panel, so the dimming
 * frames it inside its box like a padding and keeps off the panel's own controls (its fold
 * button, its edge tab).
 */
const LIGHT_MARGIN_PX = { standingFree: 8, insideABoardPanel: -6 } as const;
const LIGHT_CORNER_RADIUS_PX = 8;

/** `rect` grown by `marginPx` on every side, or shrunk by a negative one. */
function grown(rect: DOMRect, marginPx: number): DOMRect {
  return new DOMRect(
    rect.x - marginPx,
    rect.y - marginPx,
    rect.width + 2 * marginPx,
    rect.height + 2 * marginPx,
  );
}

/** A rectangle with rounded corners over `rect`, as an SVG path. */
function roundedRectOver({ left: x, top: y, width, height }: DOMRect, radius: number): string {
  const r = Math.min(radius, width / 2, height / 2);
  const corner = (toX: number, toY: number) => `A${r},${r} 0 0 1 ${toX},${toY}`;
  return [
    `M${x + r},${y}`,
    `H${x + width - r}`,
    corner(x + width, y + r),
    `V${y + height - r}`,
    corner(x + width - r, y + height),
    `H${x + r}`,
    corner(x, y + height - r),
    `V${y + r}`,
    corner(x + r, y),
    'Z',
  ].join(' ');
}

/** Whether an element with box `rect` shows: a hidden or folded-away one has no size. */
function isOnScreen(rect: DOMRect): boolean {
  return rect.width > 0 && rect.height > 0;
}

/** The screen with a hole over each of `holes`, as a CSS clip path. */
function screenWithHoles(holes: readonly string[]): string {
  const screen = `M0,0 H${window.innerWidth} V${window.innerHeight} H0 Z`;
  return `path(evenodd, '${[screen, ...holes].join(' ')}')`;
}

/** Where the spotlight lets light and clicks through: a hole over each spotlit element. */
function spotlightClipPath(): string {
  const lights = [...document.querySelectorAll(`[${SPOTLIT_ATTRIBUTE}]`)]
    .map((element) => {
      const margin = boardPanelHolding(element)
        ? LIGHT_MARGIN_PX.insideABoardPanel
        : LIGHT_MARGIN_PX.standingFree;
      return grown(element.getBoundingClientRect(), margin);
    })
    .filter(isOnScreen)
    .map((light) => roundedRectOver(light, LIGHT_CORNER_RADIUS_PX));
  return screenWithHoles(lights);
}

/**
 * The page dimmed and deaf to the pointer while the guided step's control `control` shows, but for
 * the elements marked `GUIDE_SPOTLIT` (see `LIGHT_MARGIN_PX`). A clip path cuts the holes, and a
 * cut-out part takes no click. The holes follow their elements as the page moves under them. Once
 * the control is out of sight (its panel folded), the bubble with its X goes with it, so the
 * dimming goes too: it never holds the page with no way out.
 */
export function GuideSpotlight({ control }: { readonly control: RefObject<HTMLElement | null> }) {
  const [clipPath, setClipPath] = useState<string | null>(null);
  useEffect(() => {
    let frame = 0;
    const follow = () => {
      const controlBox = control.current?.getBoundingClientRect();
      // An unchanged path is the same state, so a still page renders nothing each frame.
      setClipPath(controlBox && isOnScreen(controlBox) ? spotlightClipPath() : null);
      frame = requestAnimationFrame(follow);
    };
    follow();
    return () => cancelAnimationFrame(frame);
  }, [control]);
  if (clipPath === null) return null;
  return createPortal(
    <div
      aria-hidden="true"
      className="fixed inset-0 z-40 animate-fade-in bg-spotlight-dimming"
      style={{ clipPath }}
    />,
    document.body,
  );
}
