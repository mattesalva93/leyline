// The bubble of a guided step, an owned component on the Radix popover (ADR 0010): Radix places it
// by its control; the look is ours.
import * as RadixPopover from '@radix-ui/react-popover';
import { Slot } from '@radix-ui/react-slot';
import { useId, useMemo, useRef, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { BUTTON_STATES, HARD_DROP_SHADOW, LABEL } from '../../ui/board-styles.ts';
import { Icon } from '../../ui/Icon.tsx';
import { FADES_IN_AND_OUT } from '../../ui/open-close-motion.ts';
import {
  GUIDE_ARROW_INSET_PX,
  GUIDE_ARROW_LENGTH_PX,
  GuideArrow,
  type GuideBubbleSide,
} from './GuideArrow.tsx';
import { GUIDE_SPOTLIT, GuideSpotlight } from './GuideSpotlight.tsx';
import { guidedStepNumber, type GuidedStep } from './guided-steps.ts';
import type { Guide } from './use-guide.ts';

/** A point on the screen, in CSS px. */
interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}

/** Where a bubble stands by its control: on which side, and where in the control its arrow points. */
export interface GuidedStepPlacement {
  readonly side: GuideBubbleSide;
  /** The point inside the control, given the control's box, that the arrow's tip enters. */
  readonly aimInside: (control: DOMRect) => ScreenPoint;
}

/** Turns down what Radix would do by default: move the focus, or close on Escape or a click elsewhere. */
const preventRadixDefault = (event: Event) => event.preventDefault();

/**
 * Where the control `children` shows the bubble of its guided step `guidedStep`, at `placement`,
 * while the guide has that step on screen, the page dimmed around the step's controls. The bubble
 * follows the control in the page, so Tab reaches its X right after the control; it never takes
 * the focus, and only its X or the step's action closes it. The X gives the focus to the control,
 * which the bubble's text describes while it is on screen: a screen reader reads it out when it
 * reaches the control.
 */
export function GuidedStepBubble({
  guide,
  guidedStep,
  placement: { side, aimInside },
  children,
}: {
  readonly guide: Guide;
  readonly guidedStep: GuidedStep;
  readonly placement: GuidedStepPlacement;
  readonly children: ReactElement;
}) {
  const { t } = useTranslation();
  const controlRef = useRef<HTMLElement>(null);
  const textId = useId();
  const isShown = guide.shownGuidedStep === guidedStep;
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
    <RadixPopover.Root open={isShown} modal={false}>
      <RadixPopover.Anchor virtualRef={aimPoint} />
      <Slot
        ref={controlRef}
        aria-describedby={isShown ? textId : undefined}
        {...(isShown ? GUIDE_SPOTLIT : {})}
      >
        {children}
      </Slot>
      {isShown && <GuideSpotlight />}
      <RadixPopover.Content
        role="status"
        aria-label={t('guide.bubbleLabel')}
        side={side}
        sideOffset={GUIDE_ARROW_LENGTH_PX}
        // The arrow leaves the bubble this far along its edge: the bubble starts as far before the point.
        align="start"
        alignOffset={-GUIDE_ARROW_INSET_PX}
        // A bubble moved off its side would leave its arrow pointing away from the control.
        avoidCollisions={false}
        onOpenAutoFocus={preventRadixDefault}
        onCloseAutoFocus={preventRadixDefault}
        onEscapeKeyDown={preventRadixDefault}
        onInteractOutside={preventRadixDefault}
        className={`relative z-50 flex max-w-72 items-start gap-3 rounded-2xl border-2 border-border bg-panel py-3 pr-2 pl-4 text-base text-foreground ${HARD_DROP_SHADOW} ${FADES_IN_AND_OUT}`}
      >
        <GuideArrow side={side} />
        <div className="flex flex-1 flex-col gap-1">
          <span className={`${LABEL} text-accent`}>
            {t('guide.stepNumber', { number: guidedStepNumber(guidedStep) })}
          </span>
          <p id={textId} className="leading-snug">
            {t(`guide.steps.${guidedStep}`)}
          </p>
        </div>
        <button
          type="button"
          aria-label={t('guide.skipStep')}
          className={`grid size-6 shrink-0 place-items-center rounded-sm ${BUTTON_STATES}`}
          onClick={() => {
            // The X leaves the page with the bubble: the focus would fall back to the page's start.
            controlRef.current?.focus();
            guide.skipGuidedStep(guidedStep);
          }}
        >
          <Icon name="close" />
        </button>
      </RadixPopover.Content>
    </RadixPopover.Root>
  );
}
