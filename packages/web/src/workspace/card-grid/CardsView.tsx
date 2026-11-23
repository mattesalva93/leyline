import { CardGrid } from './CardGrid.tsx';
import type { TileSelection } from './grid-tiles.ts';
import type { GuidedStepPlacement } from '../guide/GuidedStepBubble.tsx';
import { SuggestedTokens } from '../suggested-tokens/SuggestedTokens.tsx';
import type { WorkspaceState } from '../workspace-state.ts';

/** The centre of the workspace in the "cards" view: the card grid, ending with the tokens to add. */
export function CardsView({
  state: { generator, gridSections, selection, selectTile, moveLine, tilesAreDraggable },
  tileWidthPx,
  guidedTilePlacement,
  onOpenLinePanel,
}: {
  readonly state: WorkspaceState;
  readonly tileWidthPx: number;
  /** Where the bubble of a guided step stands by the tile it points to. */
  readonly guidedTilePlacement: GuidedStepPlacement;
  /** What Enter on a tile does: see `CardGridSection`. */
  readonly onOpenLinePanel: (selection: TileSelection) => void;
}) {
  return (
    <>
      <CardGrid
        sections={gridSections}
        tileWidthPx={tileWidthPx}
        guidedTilePlacement={guidedTilePlacement}
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
        afterSections={
          <SuggestedTokens
            tokens={generator.suggestedTokens}
            creatorNamesOfSuggestedToken={generator.creatorNamesOfSuggestedToken}
            tileWidthPx={tileWidthPx}
            onAdd={generator.addSuggestedTokens}
          />
        }
      />
    </>
  );
}
