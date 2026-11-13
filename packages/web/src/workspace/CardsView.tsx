import { CardGrid } from './CardGrid.tsx';
import type { WorkspaceState } from './workspace-state.ts';

/** The centre of the workspace in the "cards" view: the card grid. */
export function CardsView({
  state: { generator, gridSections, selection, selectTile, moveLine, tilesAreDraggable },
  tileWidthPx,
}: {
  readonly state: WorkspaceState;
  readonly tileWidthPx: number;
}) {
  return (
    <CardGrid
      sections={gridSections}
      tileWidthPx={tileWidthPx}
      selection={selection}
      isResolving={generator.isResolving}
      onSelect={selectTile}
      onPickCandidate={generator.pickCandidate}
      onTileQuantityChange={generator.changeTileQuantity}
      defaultLang={generator.defaultLang}
      onAddCard={generator.addCard}
      tilesAreDraggable={tilesAreDraggable}
      onMoveLine={moveLine}
    />
  );
}
