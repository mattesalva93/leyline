import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useFoldMotion, type FoldMotion } from '../../ui/use-fold-motion.ts';
import { CENTRE_MIN_WIDTH_PX, fitSidePanels, type FittedSidePanel } from './side-panel-fit.ts';
import {
  CENTRE_SIDE,
  useSidePanelLayout,
  type SidePanelControls,
  type SidePanelName,
} from './side-panel-layout.ts';

/** A side panel as the user left it, fitted to the room the screen has for it. */
export interface SidePanelOnScreen {
  readonly controls: SidePanelControls;
  /** How it folds and opens: it shows open, and takes its room, until its content has slid away. */
  readonly fold: FoldMotion;
  readonly fitted: FittedSidePanel;
}

/** How `panel` folds as `controls` say: towards the side of the workspace away from the centre. */
function useSidePanelFold(panel: SidePanelName, controls: SidePanelControls): FoldMotion {
  return useFoldMotion(controls.isOpen, CENTRE_SIDE[panel] === 'right' ? 'left' : 'right');
}

/**
 * Both side panels as the user left them, fitted to the room the workspace has for them: it is
 * measured from the centre, the element `centreRef` is given, whenever its width changes.
 */
export function useFittedSidePanels(): {
  readonly centreRef: (centre: HTMLElement | null) => void;
  readonly panels: Readonly<Record<SidePanelName, SidePanelOnScreen>>;
} {
  const decklist = useSidePanelLayout('decklist');
  const inspector = useSidePanelLayout('inspector');
  const decklistFold = useSidePanelFold('decklist', decklist);
  const inspectorFold = useSidePanelFold('inspector', inspector);
  const [centre, setCentre] = useState<HTMLElement | null>(null);
  const [room, setRoom] = useState<number | null>(null);
  // Fitted as they show, so a folding panel keeps its room until its content has slid away.
  const fitted = fitSidePanels(
    {
      decklist: { isOpen: decklistFold.isShownOpen, width: decklist.width },
      inspector: { isOpen: inspectorFold.isShownOpen, width: inspector.width },
    },
    room,
  );
  // What the open panels take on screen next to the centre: with the centre's width, the room.
  const openWidths =
    (decklistFold.isShownOpen ? fitted.decklist.width : 0) +
    (inspectorFold.isShownOpen ? fitted.inspector.width : 0);
  const openWidthsRef = useRef(openWidths);
  useLayoutEffect(() => {
    openWidthsRef.current = openWidths;
  });
  useEffect(() => {
    if (!centre || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setRoom(Math.floor(entry.contentRect.width) + openWidthsRef.current - CENTRE_MIN_WIDTH_PX);
    });
    observer.observe(centre);
    return () => observer.disconnect();
  }, [centre]);
  return {
    centreRef: setCentre,
    panels: {
      decklist: { controls: decklist, fold: decklistFold, fitted: fitted.decklist },
      inspector: { controls: inspector, fold: inspectorFold, fitted: fitted.inspector },
    },
  };
}
