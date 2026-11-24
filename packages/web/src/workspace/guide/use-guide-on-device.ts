import { useEffect, useState } from 'react';
import type { GuidedStep } from './guided-steps.ts';
import { GUIDE_FROM_THE_START, loadSavedGuide, saveGuide, type SavedGuide } from './saved-guide.ts';

/**
 * The guide as the shell holds it, for its menu to switch it and start it over and for the
 * workspace to move it along. Every change is kept on the device.
 */
export interface GuideOnDevice {
  readonly savedGuide: SavedGuide;
  /**
   * How many times the guide was started over in this visit: an action taken before a restart
   * does not count as done after it.
   */
  readonly restartCount: number;
  readonly markGuidedStepsDone: (steps: readonly GuidedStep[]) => void;
  readonly skipGuidedStep: (step: GuidedStep) => void;
  readonly switchGuide: (isGuideOn: boolean) => void;
  /** Forgets the steps done and skipped, so the guide shows its first step again, and turns it on. */
  readonly restartGuide: () => void;
}

function withGuidedSteps(
  steps: readonly GuidedStep[],
  added: readonly GuidedStep[],
): readonly GuidedStep[] {
  const newSteps = added.filter((step) => !steps.includes(step));
  return newSteps.length === 0 ? steps : [...steps, ...newSteps];
}

export function useGuideOnDevice(): GuideOnDevice {
  const [savedGuide, setSavedGuide] = useState<SavedGuide>(loadSavedGuide);
  const [restartCount, setRestartCount] = useState(0);
  useEffect(() => saveGuide(savedGuide), [savedGuide]);
  return {
    savedGuide,
    restartCount,
    markGuidedStepsDone: (steps) =>
      setSavedGuide((current) => {
        const done = withGuidedSteps(current.done, steps);
        return done === current.done ? current : { ...current, done };
      }),
    skipGuidedStep: (step) =>
      setSavedGuide((current) => ({
        ...current,
        skipped: withGuidedSteps(current.skipped, [step]),
      })),
    switchGuide: (isGuideOn) => setSavedGuide((current) => ({ ...current, isGuideOn })),
    restartGuide: () => {
      setSavedGuide(GUIDE_FROM_THE_START);
      setRestartCount((count) => count + 1);
    },
  };
}
