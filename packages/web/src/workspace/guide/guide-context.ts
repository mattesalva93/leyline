import { createContext, useContext } from 'react';
import type { Guide } from './use-guide.ts';

/** The guide away from a workspace, as a component shown on its own has it: no step on screen. */
const NO_GUIDE: Guide = {
  shownGuidedStep: null,
  shownGuidedStepNumber: 0,
  skipGuidedStep: () => {},
};

/** The workspace's guide, for the controls its guided steps point to, however deep they stand. */
export const GuideContext = createContext<Guide>(NO_GUIDE);

export function useWorkspaceGuide(): Guide {
  return useContext(GuideContext);
}
