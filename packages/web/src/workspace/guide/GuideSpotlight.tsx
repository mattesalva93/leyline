import { useEffect, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';

const SPOTLIT_ATTRIBUTE = 'data-guide-spotlight';

/** Marks an element the spotlight of the guide leaves lit and clickable. */
export const GUIDE_SPOTLIT = { [SPOTLIT_ATTRIBUTE]: '' } as const;

const LIGHT_CORNER_RADIUS_PX = 6;

/**
 * The outline of the light over `rect`, as an SVG path: the element's own box, never wider, so no
 * control beside it (a side panel's edge tab) takes a click through the light.
 */
function lightOver({ left: x, top: y, width, height }: DOMRect): string {
  const r = LIGHT_CORNER_RADIUS_PX;
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

/** The screen with a hole over each spotlit element, as a CSS clip path. */
function clipPathOfTheDimming(): string {
  const lights = [...document.querySelectorAll(`[${SPOTLIT_ATTRIBUTE}]`)]
    .map((element) => element.getBoundingClientRect())
    .filter(isOnScreen)
    .map(lightOver);
  const screen = `M0,0 H${window.innerWidth} V${window.innerHeight} H0 Z`;
  return `path(evenodd, '${[screen, ...lights].join(' ')}')`;
}

/**
 * The page dimmed and deaf to the pointer while the guided step's control `control` shows, but for
 * the elements marked `GUIDE_SPOTLIT`: the clip path cuts a hole over each, and a cut-out part
 * takes no click. The holes follow their elements as the page moves under them. Once the control
 * is out of sight (its panel folded), the bubble with its X goes with it, so the dimming goes too:
 * it never holds the page with no way out.
 */
export function GuideSpotlight({ control }: { readonly control: RefObject<HTMLElement | null> }) {
  const [clipPath, setClipPath] = useState<string | null>(null);
  useEffect(() => {
    let frame = 0;
    const follow = () => {
      const controlBox = control.current?.getBoundingClientRect();
      setClipPath(controlBox && isOnScreen(controlBox) ? clipPathOfTheDimming() : null);
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
