import { useId, type ReactNode } from 'react';
import { BoardPanel } from '../ui/BoardPanel.tsx';
import { PanelEdgeTab, type CentreSide } from './PanelEdgeTab.tsx';
import { PanelResizeHandle } from './PanelResizeHandle.tsx';
import {
  SIDE_PANEL_WIDTH_PX,
  useSidePanelLayout,
  type SidePanelName,
} from './side-panel-layout.ts';

/**
 * A panel at the side of the workspace on a wide screen. The tab on its edge facing the centre
 * folds it down to a strip with its title, never out of sight, and opens it again;
 * dragging that edge widens or narrows it.
 */
export function SidePanel({
  name,
  title,
  as = 'section',
  centreSide,
  className = '',
  children,
}: {
  readonly name: SidePanelName;
  readonly title: string;
  readonly as?: 'section' | 'aside';
  readonly centreSide: CentreSide;
  readonly className?: string;
  readonly children: ReactNode;
}) {
  const panelId = useId();
  const limits = SIDE_PANEL_WIDTH_PX[name];
  const { isOpen, width, toggle, resize } = useSidePanelLayout(name);
  const panel = (
    <div
      className={`relative flex ${isOpen ? 'shrink' : 'shrink-0'} ${className}`}
      style={isOpen ? { minWidth: limits.min } : undefined}
    >
      <BoardPanel
        id={panelId}
        as={as}
        title={title}
        isFoldedToStrip={!isOpen}
        className={isOpen ? 'min-w-0 shrink' : 'w-10'}
        style={isOpen ? { width } : undefined}
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
  const edge = isOpen && (
    <PanelResizeHandle
      title={title}
      centreSide={centreSide}
      width={width}
      limits={limits}
      panelId={panelId}
      onResize={resize}
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
