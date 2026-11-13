import { useId, useState, type ReactNode } from 'react';
import { BoardPanel } from '../ui/BoardPanel.tsx';
import { PanelEdgeTab, type GridSide } from './PanelEdgeTab.tsx';

/**
 * A panel at the side of the workspace on a wide screen. The tab on its edge facing the card
 * grid folds it down to a strip with its title, never out of sight, and opens it again.
 */
export function SidePanel({
  title,
  as = 'section',
  gridSide,
  width,
  className = '',
  children,
}: {
  readonly title: string;
  readonly as?: 'section' | 'aside';
  readonly gridSide: GridSide;
  /** How wide the panel is while open, in CSS px. */
  readonly width: number;
  readonly className?: string;
  readonly children: ReactNode;
}) {
  const panelId = useId();
  const [isOpen, setIsOpen] = useState(true);
  return (
    <div
      className={`relative flex shrink-0 ${isOpen ? '' : 'w-10'} ${className}`}
      style={isOpen ? { width } : undefined}
    >
      <BoardPanel id={panelId} as={as} title={title} isStrip={!isOpen} className="w-full">
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
}
