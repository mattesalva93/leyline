import { useTranslation } from 'react-i18next';
import { BOARD_PANEL } from '../ui/board-styles.ts';
import { Icon } from '../ui/Icon.tsx';

/** What the centre of the workspace shows: the card grid, or the sheet as it will print. */
export type CentreView = 'cards' | 'sheet';

/** The narrow strip that switches the centre of the workspace between its views. */
export function ToolRail({
  view,
  onViewChange,
}: {
  readonly view: CentreView;
  readonly onViewChange: (view: CentreView) => void;
}) {
  const { t } = useTranslation();
  return (
    <nav
      aria-label={t('workspace.toolRail')}
      className={`${BOARD_PANEL} flex shrink-0 items-center gap-1.5 self-start p-1.5 lg:flex-col`}
    >
      {(['cards', 'sheet'] as const).map((railView) => (
        <button
          key={railView}
          type="button"
          title={t(`workspace.views.${railView}`)}
          aria-label={t(`workspace.views.${railView}`)}
          aria-pressed={view === railView}
          className={`grid size-9 place-items-center rounded-md border-2 ${view === railView ? 'border-border bg-accent text-accent-foreground' : 'border-transparent hover:border-border'}`}
          onClick={() => onViewChange(railView)}
        >
          <Icon name={railView} className="size-5" />
        </button>
      ))}
    </nav>
  );
}
