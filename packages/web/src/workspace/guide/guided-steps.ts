/** The guided steps, in the order of the generator's flow. */
export const GUIDED_STEPS = ['startDecklist'] as const;
export type GuidedStep = (typeof GUIDED_STEPS)[number];

/** Where `step` comes in the guide, counting from 1. */
export function guidedStepNumber(step: GuidedStep): number {
  return GUIDED_STEPS.indexOf(step) + 1;
}

export function isGuidedStep(value: unknown): value is GuidedStep {
  return GUIDED_STEPS.some((step) => step === value);
}

/** What the generator tells the guide, for it to know which actions the user has taken. */
export interface GuideFacts {
  /** A first line recognised, or the example loaded. */
  readonly isDecklistUnderWay: boolean;
}

const IS_ACTION_TAKEN: Readonly<Record<GuidedStep, (facts: GuideFacts) => boolean>> = {
  startDecklist: (facts) => facts.isDecklistUnderWay,
};

/** Whether the user has taken the action `step` explains. */
export function isActionTaken(step: GuidedStep, facts: GuideFacts): boolean {
  return IS_ACTION_TAKEN[step](facts);
}
