import { CardGrid } from './CardGrid.tsx';
import type { TileSelection } from './grid-tiles.ts';
import type { WorkspaceState } from './workspace-state.ts';

/** The centre of the workspace in the "cards" view: the card grid. */
export function CardsView({
  state: { generator, gridSections, selection, selectTile, moveLine, tilesAreDraggable },
  tileWidthPx,
  onOpenPanel,
}: {
  readonly state: WorkspaceState;
  readonly tileWidthPx: number;
  /** Selects the tile and takes the focus to its line's panel, as Enter on the tile does. */
  readonly onOpenPanel: (selection: TileSelection) => void;
}) {
  return (
    <CardGrid
      sections={gridSections}
      tileWidthPx={tileWidthPx}
      selection={selection}
      isResolving={generator.isResolving}
      onSelect={selectTile}
      onOpenPanel={onOpenPanel}
      onPickCandidate={generator.pickCandidate}
      onTileQuantityChange={generator.changeTileQuantity}
      defaultLang={generator.defaultLang}
      onAddCard={generator.addCard}
      tilesAreDraggable={tilesAreDraggable}
      onMoveLine={moveLine}
    />
  );
}
