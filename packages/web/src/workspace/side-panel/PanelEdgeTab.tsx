import { useTranslation } from 'react-i18next';
import { SINKS_DOWN_WITH_PRESSED_GROUP } from '../../ui/board-styles.ts';

/**
 * The side of a side panel that faces the centre of the workspace (the card grid or the sheet),
 * where its tab and its resize handle are.
 */
export type CentreSide = 'left' | 'right';

/** How far the tab stands out of its panel's edge, in CSS px. */
const EDGE_TAB_REACH_PX = 14;

/**
 * The tab standing out of a side panel's edge at mid height, on the side facing the centre:
 * it folds the panel down to a strip and opens it again, its arrow pointing the way the panel's
 * edge will move. It is the only control that does.
 */
export function PanelEdgeTab({
  title,
  centreSide,
  isOpen,
  panelId,
  onToggle,
}: {
  readonly title: string;
  readonly centreSide: CentreSide;
  readonly isOpen: boolean;
  readonly panelId: string;
  readonly onToggle: () => void;
}) {
  const { t } = useTranslation();
  const label = t(isOpen ? 'boardPanel.fold' : 'boardPanel.unfold', { title });
  const onRight = centreSide === 'right';
  const pointsLeft = onRight === isOpen;
  // The slanted faces above and below the tab make it read as a block standing out of the
  // panel's edge: each is a triangle with its upright side against the panel.
  const face = 'absolute inset-x-0 h-1.5';
  return (
    // The block inside draws the focus ring: the theme's ring would wrap the slanted faces too.
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-expanded={isOpen}
      aria-controls={panelId}
      className="group absolute top-1/2 z-20 h-14 w-4 -translate-y-1/2 font-mono text-xs font-bold text-foreground outline-none"
      style={{ [onRight ? 'right' : 'left']: -EDGE_TAB_REACH_PX }}
      onClick={onToggle}
    >
      <span
        aria-hidden="true"
        className={`${face} top-0 bg-edge-tab-top`}
        style={{
          clipPath: onRight
            ? 'polygon(0 0, 0 100%, 100% 100%)'
            : 'polygon(100% 0, 100% 100%, 0 100%)',
        }}
      />
      <span
        aria-hidden="true"
        className={`${face} bottom-0 bg-edge-tab-bottom`}
        style={{
          clipPath: onRight ? 'polygon(0 0, 100% 0, 0 100%)' : 'polygon(0 0, 100% 0, 100% 100%)',
        }}
      />
      <span
        aria-hidden="true"
        className={`absolute inset-x-0 inset-y-1.5 grid place-items-center border-2 border-border bg-panel shadow-edge-tab transition-transform ${SINKS_DOWN_WITH_PRESSED_GROUP} group-focus-visible:outline-2 group-focus-visible:outline-focus ${onRight ? 'rounded-r-md border-l-0 motion-safe:group-hover:translate-x-0.5' : 'rounded-l-md border-r-0 motion-safe:group-hover:-translate-x-0.5'}`}
      >
        {pointsLeft ? '‹' : '›'}
      </span>
    </button>
  );
}
