import { useEffect, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { boardPanelBodyHolding } from '../../ui/BoardPanel.tsx';

const SPOTLIT_ATTRIBUTE = 'data-guide-spotlight';

/** Marks an element the spotlight of the guide leaves lit and clickable. */
export const GUIDE_SPOTLIT = { [SPOTLIT_ATTRIBUTE]: '' } as const;

/** How far the light reaches past a spotlit element, in CSS px: clear of its controls' hard shadows. */
const LIGHT_REACH_PX = 8;
/**
 * How far in from the edges of a board panel's body the light stops, in CSS px: the dimming frames
 * an element filling the body inside its box like a padding, and keeps off the panel's own
 * controls (its fold button, its edge tab) and off what the body scrolls out of sight.
 */
const LIGHT_INSET_IN_A_BOARD_PANEL_PX = 6;
const LIGHT_CORNER_RADIUS_PX = 8;

/** Where `a` and `b` overlap: a box with no size when they do not. */
function overlap(a: DOMRect, b: DOMRect): DOMRect {
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  return new DOMRect(
    left,
    top,
    Math.max(Math.min(a.right, b.right) - left, 0),
    Math.max(Math.min(a.bottom, b.bottom) - top, 0),
  );
}

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

/** The light over a spotlit element, kept inside the body of a board panel holding it. */
function lightOver(element: Element): DOMRect {
  const light = grown(element.getBoundingClientRect(), LIGHT_REACH_PX);
  const panelBody = boardPanelBodyHolding(element);
  if (!panelBody) return light;
  return overlap(light, grown(panelBody.getBoundingClientRect(), -LIGHT_INSET_IN_A_BOARD_PANEL_PX));
}

/** Where the spotlight lets light and clicks through: a hole over each spotlit element. */
function spotlightClipPath(): string {
  const lights = [...document.querySelectorAll(`[${SPOTLIT_ATTRIBUTE}]`)]
    .map(lightOver)
    .filter(isOnScreen)
    .map((light) => roundedRectOver(light, LIGHT_CORNER_RADIUS_PX));
  return screenWithHoles(lights);
}

/** The layer of the dimming, under `ABOVE_GUIDE_SPOTLIGHT`. */
const GUIDE_SPOTLIGHT_LAYER = 'z-40';

/**
 * Stands an element above the dimming, lit and taking clicks: the guided step's bubble, and the
 * shell's way to switch the guide off, which a guided step on screen must leave usable.
 */
export const ABOVE_GUIDE_SPOTLIGHT = 'relative z-50';

/**
 * The page dimmed and deaf to the pointer while the guided step's control `control` shows, but for
 * the elements marked `GUIDE_SPOTLIT` (see `lightOver`). A clip path cuts the holes, and a
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
      className={`fixed inset-0 ${GUIDE_SPOTLIGHT_LAYER} animate-fade-in bg-spotlight-dimming`}
      style={{ clipPath }}
    />,
    document.body,
  );
}
