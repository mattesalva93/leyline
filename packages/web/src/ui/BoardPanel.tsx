import { useId, useState, type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { BOARD_PANEL, BUTTON_STATES, LABEL } from './board-styles.ts';

interface BoardPanelProps {
  readonly title: string;
  /** The landmark the panel is: a `section`, or an `aside` beside the main content. */
  readonly as?: 'section' | 'aside';
  /** Gives the title bar a button that folds the panel down to its title, and opens it again. */
  readonly isFoldable?: boolean;
  /**
   * Folds the panel down to a narrow strip that keeps only its title, on its side. Its content
   * stays mounted, hidden, so it comes back as it was left.
   */
  readonly isFoldedToStrip?: boolean;
  readonly id?: string;
  readonly className?: string;
  readonly style?: CSSProperties | undefined;
  readonly bodyClassName?: string;
  readonly children: ReactNode;
}

const BOARD_PANEL_ATTRIBUTE = 'data-board-panel';
const BOARD_PANEL_MARK = { [BOARD_PANEL_ATTRIBUTE]: '' } as const;

/** The board panel that holds `element`, if any: the box a reader sees it in. */
export function boardPanelHolding(element: Element): Element | null {
  return element.closest(`[${BOARD_PANEL_ATTRIBUTE}]`);
}

/** A panel lying on the board, named by the title in its bar. */
export function BoardPanel({
  title,
  as: Landmark = 'section',
  isFoldable = false,
  isFoldedToStrip = false,
  id,
  className = '',
  style,
  bodyClassName = '',
  children,
}: BoardPanelProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const bodyId = useId();
  const [isFoldedToTitle, setIsFoldedToTitle] = useState(false);
  const isOpen = !isFoldedToTitle && !isFoldedToStrip;
  return (
    <Landmark
      id={id}
      {...BOARD_PANEL_MARK}
      aria-labelledby={titleId}
      style={style}
      className={`${BOARD_PANEL} flex min-h-0 flex-col overflow-hidden ${isFoldedToStrip ? 'items-center py-3' : ''} ${className}`}
    >
      {isFoldedToStrip ? (
        <h2 id={titleId} className={`${LABEL} [writing-mode:vertical-rl]`}>
          {title}
        </h2>
      ) : (
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
              className={`grid size-7 place-items-center rounded-sm border-2 border-border bg-panel font-mono text-sm leading-none font-bold ${BUTTON_STATES}`}
              onClick={() => setIsFoldedToTitle(!isFoldedToTitle)}
            >
              {isOpen ? '▴' : '▾'}
            </button>
          )}
        </div>
      )}
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
