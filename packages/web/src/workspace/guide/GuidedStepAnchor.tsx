// The bubble of a guided step, an owned component on the Radix popover (ADR 0010): Radix places it
// beside its control and keeps it in sight; the look is ours.
import * as RadixPopover from '@radix-ui/react-popover';
import { useId, useRef, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { BUTTON_STATES, HARD_SHADOW } from '../../ui/board-styles.ts';
import { Icon } from '../../ui/Icon.tsx';
import { FADES_IN_AND_OUT } from '../../ui/open-close-motion.ts';
import type { GuidedStep } from './guided-steps.ts';
import type { Guide } from './use-guide.ts';

/** The space between a bubble and its control, in CSS px: close, never over it. */
export const GUIDED_STEP_GAP_PX = 10;

/**
 * Where a bubble stands by its control: on which side, lined up with which end of it, and how far
 * from it.
 */
export interface GuidedStepPlacement {
  readonly side: 'right' | 'bottom';
  readonly align: 'start' | 'center';
  readonly gapPx: number;
}

/** Turns down what Radix would do by default: move the focus, or close on Escape or a click elsewhere. */
const turnDown = (event: Event) => event.preventDefault();

/**
 * Where the control `children` shows the bubble of its guided step `step`, at `placement`,
 * while the guide has that step on screen. The bubble follows the control in the page, so Tab
 * reaches its X right after the control; it never takes the focus, and only its X or the step's
 * action closes it. The X gives the focus to the control, which the bubble's text describes while
 * it is on screen: a screen reader reads it out when it reaches the control.
 */
export function GuidedStepAnchor({
  guide,
  step,
  placement,
  children,
}: {
  readonly guide: Guide;
  readonly step: GuidedStep;
  readonly placement: GuidedStepPlacement;
  readonly children: ReactElement;
}) {
  const { t } = useTranslation();
  const controlRef = useRef<HTMLElement | null>(null);
  const textId = useId();
  const isShown = guide.shownStep === step;
  return (
    <RadixPopover.Root open={isShown} modal={false}>
      <RadixPopover.Anchor
        asChild
        // Radix types the anchor as a div; the control is any element.
        ref={(control) => {
          controlRef.current = control;
        }}
        aria-describedby={isShown ? textId : undefined}
      >
        {children}
      </RadixPopover.Anchor>
      <RadixPopover.Content
        role="status"
        aria-label={t('guide.bubbleLabel')}
        side={placement.side}
        align={placement.align}
        sideOffset={placement.gapPx}
        collisionPadding={16}
        onOpenAutoFocus={turnDown}
        onCloseAutoFocus={turnDown}
        onEscapeKeyDown={turnDown}
        onInteractOutside={turnDown}
        className={`z-30 flex max-w-64 items-start gap-2 rounded-lg border-2 border-border bg-panel py-2 pr-2 pl-3 text-sm text-foreground ${HARD_SHADOW} ${FADES_IN_AND_OUT}`}
      >
        <p id={textId} className="flex-1">
          {t(`guide.steps.${step}`)}
        </p>
        <button
          type="button"
          aria-label={t('guide.skipStep')}
          className={`grid size-6 shrink-0 place-items-center rounded-sm ${BUTTON_STATES}`}
          onClick={() => {
            // The X leaves the page with the bubble: the focus would fall back to the page's start.
            controlRef.current?.focus();
            guide.skipStep(step);
          }}
        >
          <Icon name="close" />
        </button>
      </RadixPopover.Content>
    </RadixPopover.Root>
  );
}
