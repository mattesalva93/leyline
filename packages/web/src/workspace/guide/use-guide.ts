import { useEffect } from 'react';
import {
  GUIDED_STEPS,
  guidedStepsFor,
  isActionTaken,
  type GuideFacts,
  type GuidedStep,
} from './guided-steps.ts';
import type { GuideOnDevice } from './use-guide-on-device.ts';

/** The guide as the workspace shows it: the one guided step on screen, if any. */
export interface Guide {
  /** The first guided step neither done nor skipped, or `null` once there is none or the guide is off. */
  readonly shownGuidedStep: GuidedStep | null;
  /** Where the shown step comes among the steps the decklist calls for, counting from 1. */
  readonly shownGuidedStepNumber: number;
  readonly skipGuidedStep: (step: GuidedStep) => void;
}

/**
 * The guide through the generator. A guided step is done as soon as the user takes its action,
 * in or out of order, and stays done, the guide switched off or not.
 */
export function useGuide(facts: GuideFacts, guideOnDevice: GuideOnDevice): Guide {
  const { savedGuide, markGuidedStepsDone, skipGuidedStep } = guideOnDevice;
  const stepsJustDone = GUIDED_STEPS.filter(
    (step) => !savedGuide.done.includes(step) && isActionTaken(step, facts),
  );
  // The shell holds the saved guide, so it learns of the steps just done once this render is over.
  useEffect(() => {
    if (stepsJustDone.length > 0) markGuidedStepsDone(stepsJustDone);
  });
  const guidedSteps = guidedStepsFor(facts);
  const shownGuidedStep = !savedGuide.isGuideOn
    ? null
    : (guidedSteps.find(
        (step) =>
          !savedGuide.done.includes(step) &&
          !savedGuide.skipped.includes(step) &&
          !stepsJustDone.includes(step),
      ) ?? null);
  return {
    shownGuidedStep,
    shownGuidedStepNumber: shownGuidedStep === null ? 0 : guidedSteps.indexOf(shownGuidedStep) + 1,
    skipGuidedStep,
  };
}
