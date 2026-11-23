import { isGuidedStep, type GuidedStep } from './guided-steps.ts';

const STORAGE_KEY = 'mtg-suite.guide';
/** Raised whenever the saved shape changes: data of any other version is left unread. */
const SAVED_GUIDE_VERSION = 1;

/** Which guided steps the user has done and which ones skipped, kept on the device. */
export interface GuideProgress {
  readonly done: readonly GuidedStep[];
  readonly skipped: readonly GuidedStep[];
}

const NO_PROGRESS: GuideProgress = { done: [], skipped: [] };

/** The guided steps among `value`, a step of an older guide left out. */
function guidedStepsOf(value: unknown): readonly GuidedStep[] {
  return Array.isArray(value) ? value.filter(isGuidedStep) : [];
}

function guideProgressOf(stored: string): GuideProgress {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    return NO_PROGRESS;
  }
  if (typeof parsed !== 'object' || parsed === null) return NO_PROGRESS;
  if (!('version' in parsed) || parsed.version !== SAVED_GUIDE_VERSION) return NO_PROGRESS;
  return {
    done: 'done' in parsed ? guidedStepsOf(parsed.done) : [],
    skipped: 'skipped' in parsed ? guidedStepsOf(parsed.skipped) : [],
  };
}

/** The progress through the guide the user left on this device, or none on a first visit. */
export function loadGuideProgress(): GuideProgress {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? NO_PROGRESS : guideProgressOf(stored);
  } catch {
    // Storage can be blocked (private windows, site data off): the guide starts from its first step.
    return NO_PROGRESS;
  }
}

export function saveGuideProgress(progress: GuideProgress): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: SAVED_GUIDE_VERSION, ...progress }),
    );
  } catch {
    // Not kept across visits: the guide may show its steps again on the next one.
  }
}
