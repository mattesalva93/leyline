import { useId, type ReactNode } from 'react';
import { BoardPanel } from '../../ui/BoardPanel.tsx';
import { PanelEdgeTab } from './PanelEdgeTab.tsx';
import { PanelResizeHandle } from './PanelResizeHandle.tsx';
import { CENTRE_SIDE, SIDE_PANEL_WIDTH_PX, type SidePanelName } from './side-panel-layout.ts';
import type { SidePanelOnScreen } from './use-fitted-side-panels.ts';

/**
 * A panel at the side of the workspace on a wide screen. The tab on its edge facing the centre
 * folds it down to a strip with its title, never out of sight, and opens it again;
 * dragging that edge widens or narrows it.
 */
export function SidePanel({
  name,
  panel: { controls, fold, fitted },
  title,
  as = 'section',
  className = '',
  children,
}: {
  readonly name: SidePanelName;
  readonly panel: SidePanelOnScreen;
  readonly title: string;
  readonly as?: 'section' | 'aside';
  readonly className?: string;
  readonly children: ReactNode;
}) {
  const panelId = useId();
  const limits = SIDE_PANEL_WIDTH_PX[name];
  const { isOpen, toggle, resize } = controls;
  const { width, maxWidth } = fitted;
  const centreSide = CENTRE_SIDE[name];
  const panel = (
    <div className={`relative flex shrink-0 ${className}`}>
      <BoardPanel
        id={panelId}
        as={as}
        title={title}
        stripFold={fold}
        className={fold.isShownOpen ? '' : 'w-10'}
        style={fold.isShownOpen ? { width } : undefined}
      >
        {children}
      </BoardPanel>
      <PanelEdgeTab
        title={title}
        centreSide={centreSide}
        isOpen={isOpen}
        panelId={panelId}
        onToggle={toggle}
      />
    </div>
  );
  const edge = fold.isShownOpen && (
    <PanelResizeHandle
      title={title}
      centreSide={centreSide}
      width={width}
      limits={{ ...limits, max: maxWidth }}
      panelId={panelId}
      onResize={(next) => resize(Math.min(maxWidth, next))}
    />
  );
  return centreSide === 'right' ? (
    <>
      {panel}
      {edge}
    </>
  ) : (
    <>
      {edge}
      {panel}
    </>
  );
}
