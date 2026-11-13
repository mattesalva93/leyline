import { useId, useState, type ReactNode } from 'react';
import { BoardPanel } from '../ui/BoardPanel.tsx';
import { PanelEdgeTab, type GridSide } from './PanelEdgeTab.tsx';
import { PanelResizeHandle } from './PanelResizeHandle.tsx';
import {
  clampSidePanelWidth,
  SIDE_PANEL_WIDTH_PX,
  type SidePanelName,
} from './side-panel-layout.ts';

/**
 * A panel at the side of the workspace on a wide screen. The tab on its edge facing the card
 * grid folds it down to a strip with its title, never out of sight, and opens it again;
 * dragging that edge widens or narrows it.
 */
export function SidePanel({
  name,
  title,
  as = 'section',
  gridSide,
  className = '',
  children,
}: {
  readonly name: SidePanelName;
  readonly title: string;
  readonly as?: 'section' | 'aside';
  readonly gridSide: GridSide;
  readonly className?: string;
  readonly children: ReactNode;
}) {
  const panelId = useId();
  const limits = SIDE_PANEL_WIDTH_PX[name];
  const [isOpen, setIsOpen] = useState(true);
  const [width, setWidth] = useState<number>(limits.default);
  const panel = (
    <div
      className={`relative flex ${isOpen ? 'shrink' : 'shrink-0'} ${className}`}
      style={isOpen ? { minWidth: limits.min } : undefined}
    >
      <BoardPanel
        id={panelId}
        as={as}
        title={title}
        isStrip={!isOpen}
        className={isOpen ? 'shrink' : 'w-10'}
        style={isOpen ? { width, minWidth: limits.min } : undefined}
      >
        {children}
      </BoardPanel>
      <PanelEdgeTab
        title={title}
        gridSide={gridSide}
        isOpen={isOpen}
        panelId={panelId}
        onToggle={() => setIsOpen(!isOpen)}
      />
    </div>
  );
  const edge = isOpen && (
    <PanelResizeHandle
      title={title}
      gridSide={gridSide}
      width={width}
      minWidth={limits.min}
      maxWidth={limits.max}
      panelId={panelId}
      onResize={(next) => setWidth(clampSidePanelWidth(name, next))}
    />
  );
  return gridSide === 'right' ? (
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
