import { useEffect, useState } from 'react';
import { GUIDED_STEPS, isActionTaken, type GuideFacts, type GuidedStep } from './guided-steps.ts';
import { loadGuideProgress, saveGuideProgress, type GuideProgress } from './saved-guide.ts';

/** The guide as the workspace shows it: the one guided step on screen, if any. */
export interface Guide {
  /** The first guided step neither done nor skipped, or `null` once there is none. */
  readonly shownStep: GuidedStep | null;
  readonly skipStep: (step: GuidedStep) => void;
}

function withStep(steps: readonly GuidedStep[], step: GuidedStep): readonly GuidedStep[] {
  return steps.includes(step) ? steps : [...steps, step];
}

/**
 * The guide through the generator. A guided step is done as soon as the user takes its action,
 * in or out of order, and stays done: the device keeps which steps are done and skipped.
 */
export function useGuide(facts: GuideFacts): Guide {
  const [progress, setProgress] = useState<GuideProgress>(loadGuideProgress);
  const stepsJustDone = GUIDED_STEPS.filter(
    (step) => !progress.done.includes(step) && isActionTaken(step, facts),
  );
  if (stepsJustDone.length > 0) {
    setProgress({ ...progress, done: stepsJustDone.reduce(withStep, progress.done) });
  }
  useEffect(() => saveGuideProgress(progress), [progress]);
  const shownStep =
    GUIDED_STEPS.find(
      (step) =>
        !progress.done.includes(step) &&
        !progress.skipped.includes(step) &&
        !stepsJustDone.includes(step),
    ) ?? null;
  return {
    shownStep,
    skipStep: (step) =>
      setProgress((current) => ({ ...current, skipped: withStep(current.skipped, step) })),
  };
}
