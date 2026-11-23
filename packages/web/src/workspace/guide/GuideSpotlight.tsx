import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const SPOTLIT_ATTRIBUTE = 'data-guide-spotlight';

/** Marks an element the spotlight of the guide leaves lit and clickable. */
export const GUIDE_SPOTLIT = { [SPOTLIT_ATTRIBUTE]: '' } as const;

/** How far the light reaches around a spotlit element, in CSS px. */
const LIGHT_MARGIN_PX = 6;
const LIGHT_CORNER_RADIUS_PX = 10;

/** The outline of the light around `rect`: a rectangle with rounded corners, as an SVG path. */
function lightAround({ left, top, right, bottom }: DOMRect): string {
  const x = left - LIGHT_MARGIN_PX;
  const y = top - LIGHT_MARGIN_PX;
  const width = right - left + 2 * LIGHT_MARGIN_PX;
  const height = bottom - top + 2 * LIGHT_MARGIN_PX;
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

/** The screen with a hole over each spotlit element, as a CSS clip path. */
function clipPathOfTheDimming(): string {
  const lights = [...document.querySelectorAll(`[${SPOTLIT_ATTRIBUTE}]`)]
    .map((element) => element.getBoundingClientRect())
    .filter((rect) => rect.width > 0 && rect.height > 0)
    .map(lightAround);
  const screen = `M0,0 H${window.innerWidth} V${window.innerHeight} H0 Z`;
  return `path(evenodd, '${[screen, ...lights].join(' ')}')`;
}

/**
 * The page dimmed and deaf to the pointer while a guided step is on screen, but for the elements
 * marked `GUIDE_SPOTLIT`: the clip path cuts a hole over each, and a cut-out part takes no click.
 * The holes follow their elements as the page moves under them.
 */
export function GuideSpotlight() {
  const [clipPath, setClipPath] = useState<string | null>(null);
  useEffect(() => {
    let frame = 0;
    const follow = () => {
      setClipPath(clipPathOfTheDimming());
      frame = requestAnimationFrame(follow);
    };
    follow();
    return () => cancelAnimationFrame(frame);
  }, []);
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
