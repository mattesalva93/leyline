import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { GridSide } from './PanelEdgeTab.tsx';
import { SIDE_PANEL_KEY_STEP_PX } from './side-panel-layout.ts';

/**
 * The edge of a side panel facing the card grid, dragged with the mouse or moved with the arrow
 * keys to widen or narrow the panel; Home and End take it to its narrowest and its widest.
 */
export function PanelResizeHandle({
  title,
  gridSide,
  width,
  minWidth,
  maxWidth,
  panelId,
  onResize,
}: {
  readonly title: string;
  readonly gridSide: GridSide;
  readonly width: number;
  readonly minWidth: number;
  readonly maxWidth: number;
  readonly panelId: string;
  /** Asks for the panel at `width`, which may be out of its limits: the panel keeps within them. */
  readonly onResize: (width: number) => void;
}) {
  const { t } = useTranslation();
  // Moving the edge towards the grid widens the panel.
  const widening = gridSide === 'right' ? 1 : -1;

  const onKeyDown = (event: KeyboardEvent) => {
    const next = {
      ArrowRight: width + widening * SIDE_PANEL_KEY_STEP_PX,
      ArrowLeft: width - widening * SIDE_PANEL_KEY_STEP_PX,
      Home: minWidth,
      End: maxWidth,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    onResize(next);
  };

  const onPointerDown = (event: ReactPointerEvent) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = width;
    const onMove = (move: PointerEvent) =>
      onResize(startWidth + widening * (move.clientX - startX));
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', () => window.removeEventListener('pointermove', onMove), {
      once: true,
    });
  };

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-label={t('boardPanel.resize', { title })}
      title={t('boardPanel.resize', { title })}
      aria-orientation="vertical"
      aria-controls={panelId}
      aria-valuenow={width}
      aria-valuemin={minWidth}
      aria-valuemax={maxWidth}
      className="-mx-[11px] w-1.5 shrink-0 cursor-col-resize touch-none rounded-full transition-colors outline-none hover:bg-accent/60 focus-visible:bg-accent"
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
    />
  );
}
