/** The guided steps, in the order of the generator's flow. */
export const GUIDED_STEPS = [
  'startDecklist',
  'openLinePanel',
  'changePrint',
  'fixLine',
  'goToSheet',
  'makePdf',
] as const;
export type GuidedStep = (typeof GUIDED_STEPS)[number];

export function isGuidedStep(value: unknown): value is GuidedStep {
  return GUIDED_STEPS.some((step) => step === value);
}

/** What the generator tells the guide, for it to know which actions the user has taken. */
export interface GuideFacts {
  /**
   * A first line recognised, or the example loaded; once the guide is started over, only with the
   * decklist written to since.
   */
  readonly hasStartedDecklist: boolean;
  /** A tile is open on the `LinePanel` of its line. */
  readonly isLinePanelOpen: boolean;
  /** A print has been tapped in the `PrintPicker`, its copies moving onto it. */
  readonly hasChangedPrint: boolean;
  /** The decklist has a line to fix that its recognition is done with. */
  readonly hasLineToFix: boolean;
  /** A line to fix has been fixed: its card picked, or the line removed. */
  readonly hasFixedLine: boolean;
  readonly isSheetInView: boolean;
  /** The PDF button has been pressed. */
  readonly hasMadePdf: boolean;
}

const IS_ACTION_TAKEN: Readonly<Record<GuidedStep, (facts: GuideFacts) => boolean>> = {
  startDecklist: (facts) => facts.hasStartedDecklist,
  openLinePanel: (facts) => facts.isLinePanelOpen,
  changePrint: (facts) => facts.hasChangedPrint,
  fixLine: (facts) => facts.hasFixedLine,
  goToSheet: (facts) => facts.isSheetInView,
  makePdf: (facts) => facts.hasMadePdf,
};

/** Whether the user has taken the action `step` explains. */
export function isActionTaken(step: GuidedStep, facts: GuideFacts): boolean {
  return IS_ACTION_TAKEN[step](facts);
}

/** The guided steps the decklist calls for: the one of the line to fix only while it has one. */
export function guidedStepsFor(facts: GuideFacts): readonly GuidedStep[] {
  return GUIDED_STEPS.filter((step) => step !== 'fixLine' || facts.hasLineToFix);
}
