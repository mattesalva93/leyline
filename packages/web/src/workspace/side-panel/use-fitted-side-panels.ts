import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CENTRE_MIN_WIDTH_PX, fitSidePanels, type FittedSidePanel } from './side-panel-fit.ts';
import {
  useSidePanelLayout,
  type SidePanelControls,
  type SidePanelName,
} from './side-panel-layout.ts';

/** A side panel as the user left it, fitted to the room the screen has for it. */
export interface SidePanelOnScreen {
  readonly controls: SidePanelControls;
  readonly fitted: FittedSidePanel;
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
  const [centre, setCentre] = useState<HTMLElement | null>(null);
  const [room, setRoom] = useState<number | null>(null);
  const fitted = fitSidePanels({ decklist, inspector }, room);
  // What the open panels take on screen next to the centre: with the centre's width, the room.
  const openWidths =
    (decklist.isOpen ? fitted.decklist.width : 0) + (inspector.isOpen ? fitted.inspector.width : 0);
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
      decklist: { controls: decklist, fitted: fitted.decklist },
      inspector: { controls: inspector, fitted: fitted.inspector },
    },
  };
}
