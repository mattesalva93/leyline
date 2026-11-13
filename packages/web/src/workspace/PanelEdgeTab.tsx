import { useTranslation } from 'react-i18next';

/** The side of a side panel that faces the card grid, where its tab and its resize handle are. */
export type GridSide = 'left' | 'right';

/**
 * The tab standing out of a side panel's edge at mid height, on the side facing the card grid:
 * it folds the panel down to a strip and opens it again, its arrow pointing the way the panel's
 * edge will move. It is the only control that does.
 */
export function PanelEdgeTab({
  title,
  gridSide,
  isOpen,
  panelId,
  onToggle,
}: {
  readonly title: string;
  readonly gridSide: GridSide;
  readonly isOpen: boolean;
  readonly panelId: string;
  readonly onToggle: () => void;
}) {
  const { t } = useTranslation();
  const label = t(isOpen ? 'boardPanel.fold' : 'boardPanel.unfold', { title });
  const onRight = gridSide === 'right';
  const pointsLeft = onRight === isOpen;
  // The slanted faces above and below the tab make it read as a block standing out of the
  // panel's edge: each is a triangle with its upright side against the panel.
  const face = 'absolute inset-x-0 h-1.5';
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-expanded={isOpen}
      aria-controls={panelId}
      className={`group absolute top-1/2 z-20 h-14 w-4 -translate-y-1/2 font-mono text-xs font-bold text-foreground ${onRight ? '-right-[14px]' : '-left-[14px]'}`}
      onClick={onToggle}
    >
      <span
        aria-hidden="true"
        className={`${face} top-0 bg-[color-mix(in_oklab,var(--color-panel)_70%,var(--color-border))]`}
        style={{
          clipPath: onRight
            ? 'polygon(0 0, 0 100%, 100% 100%)'
            : 'polygon(100% 0, 100% 100%, 0 100%)',
        }}
      />
      <span
        aria-hidden="true"
        className={`${face} bottom-0 bg-[color-mix(in_oklab,var(--color-panel)_35%,var(--color-border))]`}
        style={{
          clipPath: onRight ? 'polygon(0 0, 100% 0, 0 100%)' : 'polygon(0 0, 100% 0, 100% 100%)',
        }}
      />
      <span
        aria-hidden="true"
        className={`absolute inset-x-0 inset-y-1.5 grid place-items-center border-2 border-border bg-panel shadow-[inset_0_2px_0_rgb(255_255_255/0.35),inset_0_-2px_0_rgb(0_0_0/0.18)] transition-transform group-focus-visible:outline-2 group-focus-visible:outline-accent ${onRight ? 'rounded-r-md border-l-0 group-hover:translate-x-0.5' : 'rounded-l-md border-r-0 group-hover:-translate-x-0.5'}`}
      >
        {pointsLeft ? '‹' : '›'}
      </span>
    </button>
  );
}
