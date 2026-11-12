import { useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { BOARD_PANEL, LABEL } from './board-styles.ts';

interface BoardPanelProps {
  readonly title: string;
  /** The landmark the panel is: a `section`, or an `aside` beside the main content. */
  readonly as?: 'section' | 'aside';
  /** Gives the title bar a button that folds the panel down to its title, and opens it again. */
  readonly isFoldable?: boolean;
  readonly className?: string;
  readonly bodyClassName?: string;
  readonly children: ReactNode;
}

/** A panel lying on the board, named by the title in its bar. */
export function BoardPanel({
  title,
  as: Landmark = 'section',
  isFoldable = false,
  className = '',
  bodyClassName = '',
  children,
}: BoardPanelProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const bodyId = useId();
  const [isOpen, setIsOpen] = useState(true);
  return (
    <Landmark
      aria-labelledby={titleId}
      className={`${BOARD_PANEL} flex min-h-0 flex-col overflow-hidden ${className}`}
    >
      <div
        className={`flex shrink-0 items-center justify-between gap-2 bg-raised px-3 py-1 ${isOpen ? 'border-b-2 border-border' : ''}`}
      >
        <h2 id={titleId} className={LABEL}>
          {title}
        </h2>
        {isFoldable && (
          <button
            type="button"
            aria-label={t(isOpen ? 'boardPanel.fold' : 'boardPanel.unfold', { title })}
            aria-expanded={isOpen}
            aria-controls={bodyId}
            className="grid size-7 place-items-center rounded-sm border-2 border-border bg-panel font-mono text-sm leading-none font-bold hover:bg-accent hover:text-accent-foreground"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? '▴' : '▾'}
          </button>
        )}
      </div>
      <div
        id={bodyId}
        hidden={!isOpen}
        className={`min-h-0 flex-1 flex-col ${isOpen ? 'flex' : ''} ${bodyClassName}`}
      >
        {children}
      </div>
    </Landmark>
  );
}
