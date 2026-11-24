// The bubble of a guided step, an owned component on Radix primitives (ADR 0010): Radix's popper
// places it by its control and its presence keeps it on the page while it fades out; the look is
// ours. It is no popover: a popover answers Escape and clicks elsewhere, and swallows the Escape
// meant for the page around it, while only its X or the step's action closes a bubble.
import * as RadixPopper from '@radix-ui/react-popper';
import { Presence } from '@radix-ui/react-presence';
import { Slot } from '@radix-ui/react-slot';
import { useEffect, useId, useMemo, useRef, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { BUTTON_STATES, HARD_DROP_SHADOW, LABEL } from '../../ui/board-styles.ts';
import { Icon } from '../../ui/Icon.tsx';
import { FADES_IN_AND_OUT } from '../../ui/open-close-motion.ts';
import {
  GUIDE_ARROW_INSET_PX,
  GUIDE_ARROW_LENGTH_PX,
  GuideArrow,
  type GuideBubbleAlign,
  type GuideBubbleSide,
} from './GuideArrow.tsx';
import { ABOVE_GUIDE_SPOTLIGHT, GUIDE_SPOTLIT, GuideSpotlight } from './GuideSpotlight.tsx';
import type { GuidedStep } from './guided-steps.ts';
import { useWorkspaceGuide } from './guide-context.ts';

/** A point on the screen, in CSS px. */
interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * Where a bubble stands by its control: on which side, which way along that side it runs from
 * its arrow, and where in the control its arrow points.
 */
export interface GuidedStepPlacement {
  readonly side: GuideBubbleSide;
  /** `end` for a control near the far edge of the screen: the bubble runs back from its arrow. */
  readonly align?: GuideBubbleAlign;
  /** The point inside the control, given the control's box, that the arrow's tip enters. */
  readonly aimInside: (control: DOMRect) => ScreenPoint;
}

/**
 * Where the control `children` shows the bubble of its guided step `guidedStep`, at `placement`,
 * while the workspace's guide has that step on screen, the page dimmed around the step's
 * controls. The bubble follows the control in the page, so Tab reaches its X right after the control; it never takes
 * the focus, and only its X or the step's action closes it. The X gives the focus to the control,
 * which the bubble's text describes while it is on screen: a screen reader reads it out when it
 * reaches the control.
 */
export function GuidedStepBubble({
  guidedStep,
  placement: { side, align = 'start', aimInside },
  children,
}: {
  /** `null` for a control no guided step points to now: it keeps its element as one comes and goes. */
  readonly guidedStep: GuidedStep | null;
  readonly placement: GuidedStepPlacement;
  readonly children: ReactElement;
}) {
  const { t } = useTranslation();
  const guide = useWorkspaceGuide();
  const controlRef = useRef<HTMLElement>(null);
  const textId = useId();
  const isShown = guidedStep !== null && guide.shownGuidedStep === guidedStep;
  // A control out of sight, such as a line to fix far down the grid, comes to the middle of the
  // screen, leaving its bubble room on either side.
  useEffect(() => {
    const control = controlRef.current;
    if (!isShown || !control) return;
    const { top, bottom } = control.getBoundingClientRect();
    if (top < 0 || bottom > window.innerHeight) control.scrollIntoView({ block: 'center' });
  }, [isShown]);
  // The bubble stands by a point inside the control, read as the control is now: a control that
  // comes back in a new element, as a phone's folding panel brings it, keeps its bubble.
  const aimPoint = useMemo(
    () => ({
      current: {
        getBoundingClientRect: () => {
          const { x, y } = aimInside(controlRef.current?.getBoundingClientRect() ?? new DOMRect());
          return new DOMRect(x, y, 0, 0);
        },
      },
    }),
    [aimInside],
  );
  return (
    <RadixPopper.Root>
      <RadixPopper.Anchor virtualRef={aimPoint} />
      <Slot
        ref={controlRef}
        aria-describedby={isShown ? textId : undefined}
        {...(isShown ? GUIDE_SPOTLIT : {})}
      >
        {children}
      </Slot>
      {isShown && <GuideSpotlight control={controlRef} />}
      <Presence present={isShown}>
        <RadixPopper.Content
          role="status"
          aria-label={t('guide.bubbleLabel')}
          data-state={isShown ? 'open' : 'closed'}
          side={side}
          sideOffset={GUIDE_ARROW_LENGTH_PX}
          // The arrow leaves the bubble this far along its edge: the bubble starts as far before the point.
          align={align}
          alignOffset={-GUIDE_ARROW_INSET_PX}
          // A bubble moved off its side would leave its arrow pointing away from the control.
          avoidCollisions={false}
          className={`${ABOVE_GUIDE_SPOTLIGHT} flex max-w-72 items-start gap-3 rounded-2xl border-2 border-border bg-panel py-3 pr-2 pl-4 text-base text-foreground ${HARD_DROP_SHADOW} ${FADES_IN_AND_OUT}`}
        >
          <GuideArrow side={side} align={align} />
          <div className="flex flex-1 flex-col gap-1">
            <span className={`${LABEL} text-accent`}>
              {t('guide.stepNumber', { number: guide.shownGuidedStepNumber })}
            </span>
            <p id={textId} className="leading-snug">
              {guidedStep && t(`guide.steps.${guidedStep}`)}
            </p>
          </div>
          <button
            type="button"
            aria-label={t('guide.skipStep')}
            className={`grid size-6 shrink-0 place-items-center rounded-sm ${BUTTON_STATES}`}
            onClick={() => {
              // The X leaves the page with the bubble: the focus would fall back to the page's start.
              controlRef.current?.focus();
              if (guidedStep) guide.skipGuidedStep(guidedStep);
            }}
          >
            <Icon name="close" />
          </button>
        </RadixPopper.Content>
      </Presence>
    </RadixPopper.Root>
  );
}
