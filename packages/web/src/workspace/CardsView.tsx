import { useTranslation } from 'react-i18next';
import { CardGrid } from './CardGrid.tsx';
import type { WorkspaceState } from './workspace-state.ts';

/** The centre of the workspace in the "cards" view: the card grid, or how to start one. */
export function CardsView({
  workspace: { generator, gridTiles, selection, select },
}: {
  readonly workspace: WorkspaceState;
}) {
  const { t } = useTranslation();
  return gridTiles.length === 0 ? (
    <p className="max-w-xl p-4 text-sm text-muted-foreground">{t('app.intro')}</p>
  ) : (
    <CardGrid
      gridTiles={gridTiles}
      selection={selection}
      isResolving={generator.isResolving}
      onSelect={select}
      onPickCandidate={generator.pickCandidate}
    />
  );
}
