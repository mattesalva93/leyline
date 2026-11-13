import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { CentreSide } from './PanelEdgeTab.tsx';
import { SIDE_PANEL_KEY_STEP_PX, type SidePanelWidthLimits } from './side-panel-layout.ts';

/**
 * The edge of a side panel facing the centre, dragged with the mouse or moved with the arrow
 * keys to widen or narrow the panel; Home and End take it to its narrowest and its widest.
 */
export function PanelResizeHandle({
  title,
  centreSide,
  width,
  limits,
  panelId,
  onResize,
}: {
  readonly title: string;
  readonly centreSide: CentreSide;
  readonly width: number;
  readonly limits: SidePanelWidthLimits;
  readonly panelId: string;
  /** Asks for the panel at `width`, which may be out of its limits: the panel keeps within them. */
  readonly onResize: (width: number) => void;
}) {
  const { t } = useTranslation();
  const widening = centreSide === 'right' ? 1 : -1;
  const drag = useRef<{ readonly startX: number; readonly startWidth: number } | null>(null);

  const onKeyDown = (event: KeyboardEvent) => {
    const next = {
      ArrowRight: width + widening * SIDE_PANEL_KEY_STEP_PX,
      ArrowLeft: width - widening * SIDE_PANEL_KEY_STEP_PX,
      Home: limits.min,
      End: limits.max,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    onResize(next);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    // Captured, the pointer's moves reach the edge wherever it goes, even off the window.
    event.currentTarget.setPointerCapture?.(event.pointerId);
    drag.current = { startX: event.clientX, startWidth: width };
  };
  const onPointerMove = (event: PointerEvent) => {
    if (drag.current === null) return;
    onResize(drag.current.startWidth + widening * (event.clientX - drag.current.startX));
  };
  const endDrag = () => {
    drag.current = null;
  };

  const label = t('sidePanel.resize', { title });
  return (
    <div
      role="separator"
      tabIndex={0}
      aria-label={label}
      title={label}
      aria-orientation="vertical"
      aria-controls={panelId}
      aria-valuenow={width}
      aria-valuemin={limits.min}
      aria-valuemax={limits.max}
      className="-mx-[11px] w-1.5 shrink-0 cursor-col-resize touch-none rounded-full transition-colors outline-none hover:bg-accent/60 focus-visible:bg-accent"
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onLostPointerCapture={endDrag}
    />
  );
}
