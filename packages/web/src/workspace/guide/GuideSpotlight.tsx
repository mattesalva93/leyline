import { useEffect, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { boardPanelHolding } from '../../ui/BoardPanel.tsx';

const SPOTLIT_ATTRIBUTE = 'data-guide-spotlight';

/** Marks an element the spotlight of the guide leaves lit and clickable. */
export const GUIDE_SPOTLIT = { [SPOTLIT_ATTRIBUTE]: '' } as const;

/** How far the light reaches past a lit box, in CSS px: clear of its hard shadow. */
const LIGHT_MARGIN_PX = 8;
const LIGHT_CORNER_RADIUS_PX = 10;

/** `rect` grown by `marginPx` on every side. */
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

/**
 * Where the spotlight lets light and clicks through: the light over the whole box each spotlit
 * element sits in (its board panel, with its border and shadow), the clicks over the spotlit
 * element alone. Between the two the page looks lit but takes no click, as a padding inside
 * the box: a panel's own controls (its fold button, its edge tab) wait for the guided step.
 */
function spotlightClipPaths(): { readonly light: string; readonly clicks: string } {
  const spotlit = [...document.querySelectorAll(`[${SPOTLIT_ATTRIBUTE}]`)].filter((element) =>
    isOnScreen(element.getBoundingClientRect()),
  );
  const boxes = spotlit.map((element) => {
    const box = (boardPanelHolding(element) ?? element).getBoundingClientRect();
    return roundedRectOver(grown(box, LIGHT_MARGIN_PX), LIGHT_CORNER_RADIUS_PX);
  });
  const elements = spotlit.map((element) => roundedRectOver(element.getBoundingClientRect(), 0));
  return { light: screenWithHoles(boxes), clicks: screenWithHoles(elements) };
}

/**
 * The page dimmed and deaf to the pointer while the guided step's control `control` shows, but for
 * the elements marked `GUIDE_SPOTLIT`, lit in their boxes (see `spotlightClipPaths`). A clip path
 * cuts the holes, and a cut-out part takes no click. The holes follow their elements as the page
 * moves under them. Once the control
 * is out of sight (its panel folded), the bubble with its X goes with it, so the dimming goes too:
 * it never holds the page with no way out.
 */
export function GuideSpotlight({ control }: { readonly control: RefObject<HTMLElement | null> }) {
  const [clipPaths, setClipPaths] = useState<ReturnType<typeof spotlightClipPaths> | null>(null);
  useEffect(() => {
    let frame = 0;
    const follow = () => {
      const controlBox = control.current?.getBoundingClientRect();
      const next = controlBox && isOnScreen(controlBox) ? spotlightClipPaths() : null;
      // Unchanged paths keep the same state, so a still page renders nothing each frame.
      setClipPaths((current) =>
        current?.light === next?.light && current?.clicks === next?.clicks ? current : next,
      );
      frame = requestAnimationFrame(follow);
    };
    follow();
    return () => cancelAnimationFrame(frame);
  }, [control]);
  if (clipPaths === null) return null;
  return createPortal(
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-40 animate-fade-in bg-spotlight-dimming"
        style={{ clipPath: clipPaths.light }}
      />
      <div
        aria-hidden="true"
        className="fixed inset-0 z-40"
        style={{ clipPath: clipPaths.clicks }}
      />
    </>,
    document.body,
  );
}
