import { useTranslation } from 'react-i18next';
import { CardGrid } from './CardGrid.tsx';
import type { WorkspaceState } from './workspace-state.ts';

/** The centre of the workspace in the "cards" view: the card grid, or how to start one. */
export function CardsView({
  state: { generator, gridSections, selection, selectTile, moveLine, tilesAreDraggable },
  tileWidthPx,
}: {
  readonly state: WorkspaceState;
  readonly tileWidthPx: number;
}) {
  const { t } = useTranslation();
  return gridSections.length === 0 ? (
    <p className="max-w-xl p-4 text-sm text-muted-foreground">{t('app.intro')}</p>
  ) : (
    <CardGrid
      sections={gridSections}
      tileWidthPx={tileWidthPx}
      selection={selection}
      isResolving={generator.isResolving}
      onSelect={selectTile}
      onPickCandidate={generator.pickCandidate}
      onTileQuantityChange={generator.changeTileQuantity}
      tilesAreDraggable={tilesAreDraggable}
      onMoveLine={moveLine}
    />
  );
}
