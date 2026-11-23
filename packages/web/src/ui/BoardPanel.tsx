import { useId, useState, type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { BOARD_PANEL, BUTTON_STATES, LABEL } from './board-styles.ts';
import { useFoldMotion, type FoldMotion } from './use-fold-motion.ts';

interface BoardPanelProps {
  readonly title: string;
  /** The landmark the panel is: a `section`, or an `aside` beside the main content. */
  readonly as?: 'section' | 'aside';
  /** Gives the title bar a button that folds the panel down to its title, and opens it again. */
  readonly isFoldable?: boolean;
  /**
   * Folds the panel down to a narrow strip that keeps only its title, on its side, once its content
   * has slid away. Its content stays mounted, hidden, so it comes back as it was left.
   */
  readonly stripFold?: FoldMotion;
  readonly id?: string;
  readonly className?: string;
  readonly style?: CSSProperties | undefined;
  readonly bodyClassName?: string;
  readonly children: ReactNode;
}

const BOARD_PANEL_ATTRIBUTE = 'data-board-panel';
const BOARD_PANEL_MARK = { [BOARD_PANEL_ATTRIBUTE]: '' } as const;
const BOARD_PANEL_BODY_ATTRIBUTE = 'data-board-panel-body';
const BOARD_PANEL_BODY_MARK = { [BOARD_PANEL_BODY_ATTRIBUTE]: '' } as const;

/** The body of the board panel that holds `element`, if any: the box below the panel's title bar. */
export function boardPanelBodyHolding(element: Element): Element | null {
  return element.closest(`[${BOARD_PANEL_BODY_ATTRIBUTE}]`);
}

/** A panel lying on the board, named by the title in its bar. */
export function BoardPanel({
  title,
  as: Landmark = 'section',
  isFoldable = false,
  stripFold,
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
  const titleFold = useFoldMotion(!isFoldedToTitle, 'top');
  const isFoldedToStrip = stripFold !== undefined && !stripFold.isShownOpen;
  const isOpenUnderTitle = !isFoldedToTitle;
  return (
    <Landmark
      id={id}
      {...BOARD_PANEL_MARK}
      aria-labelledby={titleId}
      style={style}
      className={`${BOARD_PANEL} flex min-h-0 flex-col overflow-hidden ${isFoldedToStrip ? 'items-center py-3' : ''} ${className}`}
    >
      {isFoldedToStrip && (
        <h2
          id={titleId}
          className={`${LABEL} [writing-mode:vertical-rl] ${stripFold?.slidingPart['data-state'] === 'closed' ? 'animate-fade-in' : ''}`}
        >
          {title}
        </h2>
      )}
      <div
        {...stripFold?.slidingPart}
        hidden={isFoldedToStrip}
        className={`min-h-0 flex-1 flex-col ${isFoldedToStrip ? '' : 'flex'} ${stripFold?.slidingPart.className ?? ''}`}
      >
        {/* Above the content, which slides away under it as the panel folds to its title. */}
        <div
          className={`relative z-10 flex shrink-0 items-center justify-between gap-2 bg-raised px-3 py-1 ${titleFold.isShownOpen ? 'border-b-2 border-border' : ''}`}
        >
          <h2 id={isFoldedToStrip ? undefined : titleId} className={LABEL}>
            {title}
          </h2>
          {isFoldable && (
            <button
              type="button"
              aria-label={t(isOpenUnderTitle ? 'boardPanel.fold' : 'boardPanel.unfold', { title })}
              aria-expanded={isOpenUnderTitle}
              aria-controls={bodyId}
              className={`grid size-7 place-items-center rounded-sm border-2 border-border bg-panel font-mono text-sm leading-none font-bold ${BUTTON_STATES}`}
              onClick={() => setIsFoldedToTitle(!isFoldedToTitle)}
            >
              {isOpenUnderTitle ? '▴' : '▾'}
            </button>
          )}
        </div>
        <div
          id={bodyId}
          {...BOARD_PANEL_BODY_MARK}
          hidden={!titleFold.isShownOpen}
          {...titleFold.slidingPart}
          className={`min-h-0 flex-1 flex-col ${titleFold.isShownOpen ? 'flex' : ''} ${titleFold.slidingPart.className} ${bodyClassName}`}
        >
          {children}
        </div>
      </div>
    </Landmark>
  );
}
