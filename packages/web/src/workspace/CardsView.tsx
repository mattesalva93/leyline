import { CardGrid } from './CardGrid.tsx';
import type { TileSelection } from './grid-tiles.ts';
import type { WorkspaceState } from './workspace-state.ts';

/** The centre of the workspace in the "cards" view: the card grid. */
export function CardsView({
  state: { generator, gridSections, selection, selectTile, moveLine, tilesAreDraggable },
  tileWidthPx,
  onOpenLinePanel,
}: {
  readonly state: WorkspaceState;
  readonly tileWidthPx: number;
  /** What Enter on a tile does: see `CardGridSection`. */
  readonly onOpenLinePanel: (selection: TileSelection) => void;
}) {
  return (
    <CardGrid
      sections={gridSections}
      tileWidthPx={tileWidthPx}
      selection={selection}
      isResolving={generator.isResolving}
      onSelect={selectTile}
      onOpenLinePanel={onOpenLinePanel}
      onPickCandidate={generator.pickCandidate}
      onTileQuantityChange={generator.changeTileQuantity}
      onRemoveLine={generator.removeLine}
      defaultLang={generator.defaultLang}
      onAddCard={generator.addCard}
      tilesAreDraggable={tilesAreDraggable}
      onMoveLine={moveLine}
    />
  );
}
