import { isGuidedStep, type GuidedStep } from './guided-steps.ts';

const STORAGE_KEY = 'leyline.guide';
/** Raised whenever the saved shape changes: data of any other version is left unread. */
const SAVED_GUIDE_VERSION = 1;

/**
 * The guide as the device keeps it: whether the user has it on, and which guided steps they have
 * done and which ones skipped.
 */
export interface SavedGuide {
  readonly isGuideOn: boolean;
  readonly done: readonly GuidedStep[];
  readonly skipped: readonly GuidedStep[];
}

/** The guide of a first visit: on, from its first step. */
export const GUIDE_FROM_THE_START: SavedGuide = { isGuideOn: true, done: [], skipped: [] };

/** The guided steps among `value`, a step of an older guide left out. */
function guidedStepsOf(value: unknown): readonly GuidedStep[] {
  return Array.isArray(value) ? value.filter(isGuidedStep) : [];
}

function savedGuideOf(stored: string): SavedGuide {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    return GUIDE_FROM_THE_START;
  }
  if (typeof parsed !== 'object' || parsed === null) return GUIDE_FROM_THE_START;
  if (!('version' in parsed) || parsed.version !== SAVED_GUIDE_VERSION) return GUIDE_FROM_THE_START;
  return {
    // Saved before the guide could be switched off: it was on.
    isGuideOn: !('isGuideOn' in parsed) || parsed.isGuideOn !== false,
    done: 'done' in parsed ? guidedStepsOf(parsed.done) : [],
    skipped: 'skipped' in parsed ? guidedStepsOf(parsed.skipped) : [],
  };
}

/** The guide the user left on this device, or the guide from the start on a first visit. */
export function loadSavedGuide(): SavedGuide {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? GUIDE_FROM_THE_START : savedGuideOf(stored);
  } catch {
    // Storage can be blocked (private windows, site data off): the guide starts from its first step.
    return GUIDE_FROM_THE_START;
  }
}

export function saveGuide(savedGuide: SavedGuide): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: SAVED_GUIDE_VERSION, ...savedGuide }),
    );
  } catch {
    // Not kept across visits: the guide may show its steps again on the next one.
  }
}
