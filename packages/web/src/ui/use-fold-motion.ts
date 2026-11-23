import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

/** The side a panel's content slides away to as the panel folds, and comes back from as it opens. */
export type FoldSide = 'left' | 'right' | 'top';

const FOLDS_TOWARD: Readonly<Record<FoldSide, string>> = {
  left: 'folds-toward-left',
  right: 'folds-toward-right',
  top: 'folds-toward-top',
};

const UNFOLDS_AND_FOLDS = 'data-[state=open]:animate-unfold data-[state=closed]:animate-fold';

/** The motion the sliding part last started, as a Radix part names its states. */
type FoldState = 'open' | 'closed';

export interface FoldMotion {
  /** Whether the panel shows open: it still does while its content slides away. */
  readonly isShownOpen: boolean;
  /** Spread on the part that slides: the panel's content. */
  readonly slidingPart: {
    readonly ref: RefObject<HTMLDivElement | null>;
    readonly 'data-state': FoldState | undefined;
    readonly className: string;
  };
}

/**
 * A motion under way: when it started, how long it lasts, and the head start it took, as the share
 * of its course it skipped.
 */
interface MotionUnderWay {
  readonly startedAtMs: number;
  readonly durationMs: number;
  readonly headStart: number;
}

/** The share of its course `motion` has run by `nowMs`: all of it once over, or with none known. */
function reachOf(motion: MotionUnderWay | null, nowMs: number): number {
  if (!motion || motion.durationMs <= 0) return 1;
  return Math.min(1, motion.headStart + (nowMs - motion.startedAtMs) / motion.durationMs);
}

/**
 * Starts the motion `part` has just been given `headStart` of the way through its course, and
 * says how long that course lasts, in ms: 0 where nothing runs.
 */
function startPartWay(part: Element, headStart: number): number {
  // jsdom has no Web Animations.
  if (!('getAnimations' in part)) return 0;
  const [animation] = part.getAnimations();
  const duration = animation?.effect?.getComputedTiming().duration;
  if (!animation || typeof duration !== 'number') return 0;
  animation.currentTime = headStart * duration;
  return duration;
}

function isAnimated(element: Element | null): boolean {
  const name = element ? getComputedStyle(element).animationName : '';
  return name !== '' && name !== 'none';
}

/**
 * The motion of a panel that folds and opens again in place, its content staying mounted: the
 * content slides in from `foldsToward` as the panel opens, and away to it before the panel shows
 * folded, as Radix keeps a closing part on the page until its exit animation ends. Nothing moves
 * on the first render: a panel already open or folded is simply there.
 *
 * A motion that turns back halfway starts from where the content is, not from its far end: it
 * skips as much of its course as the motion it interrupts had left. That puts it where the content
 * is because the theme eases the fold in and the opening out, each the mirror of the other.
 */
export function useFoldMotion(isOpen: boolean, foldsToward: FoldSide): FoldMotion {
  const [wasOpen, setWasOpen] = useState(isOpen);
  const [isShownOpen, setIsShownOpen] = useState(isOpen);
  const [foldState, setFoldState] = useState<FoldState | undefined>(undefined);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    setFoldState(isOpen ? 'open' : 'closed');
    if (isOpen) setIsShownOpen(true);
  }
  const ref = useRef<HTMLDivElement>(null);
  const motionUnderWay = useRef<MotionUnderWay | null>(null);
  useLayoutEffect(() => {
    const part = ref.current;
    if (!part || foldState === undefined) return;
    const nowMs = performance.now();
    const headStart = 1 - reachOf(motionUnderWay.current, nowMs);
    motionUnderWay.current = {
      startedAtMs: nowMs,
      durationMs: startPartWay(part, headStart),
      headStart,
    };
  }, [foldState]);
  const isFolding = foldState === 'closed' && isShownOpen;
  useLayoutEffect(() => {
    const part = ref.current;
    if (!isFolding) return;
    // With no animation to wait for (a stylesheet that does not animate it), it folds at once.
    if (!part || !isAnimated(part)) {
      setIsShownOpen(false);
      return;
    }
    const endFolding = (event: AnimationEvent) => {
      // The content's own animations, such as an image fading in, end there too; and the opening
      // this fold cut short may still report its end.
      const isTheFold = getComputedStyle(part).animationName === event.animationName;
      if (event.target === part && isTheFold) setIsShownOpen(false);
    };
    // Listened to natively, as Radix does: React hears no animation event where the browser
    // lacks `AnimationEvent`.
    part.addEventListener('animationend', endFolding);
    part.addEventListener('animationcancel', endFolding);
    return () => {
      part.removeEventListener('animationend', endFolding);
      part.removeEventListener('animationcancel', endFolding);
    };
  }, [isFolding]);
  return {
    isShownOpen,
    slidingPart: {
      ref,
      'data-state': foldState,
      className: `${FOLDS_TOWARD[foldsToward]} ${UNFOLDS_AND_FOLDS}`,
    },
  };
}
