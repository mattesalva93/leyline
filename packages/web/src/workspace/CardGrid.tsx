import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GridTile } from './grid-tiles.ts';
import { ImagelessTile } from './ImagelessTile.tsx';
import { PrintTileCard, TILE_GAP_PX } from './PrintTileCard.tsx';

/** Narrowest a tile gets, in CSS px; the grid stretches tiles to fill its rows. */
const TILE_MIN_WIDTH_PX = 150;

/** Which tile is selected: its line, and the print it shows (`null` for an imageless tile). */
export interface TileSelection {
  readonly writtenIndex: number;
  readonly printId: string | null;
}

interface CardGridProps {
  readonly gridTiles: readonly GridTile[];
  readonly selection: TileSelection | null;
  readonly isResolving: boolean;
  readonly onSelect: (selection: TileSelection | null) => void;
  readonly onPickCandidate: (writtenIndex: number, oracleId: string) => void;
}

/** How many columns `grid` lays its tiles in, updated as its width changes. */
function useColumnCount(grid: React.RefObject<HTMLElement | null>): number {
  const [columns, setColumns] = useState(1);
  useEffect(() => {
    const element = grid.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    // The grid changes width with the window and the side panels.
    const observer = new ResizeObserver(() =>
      setColumns(getComputedStyle(element).gridTemplateColumns.split(' ').length),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [grid]);
  return columns;
}

function isSelected(gridTile: GridTile, selection: TileSelection | null): boolean {
  if (selection?.writtenIndex !== gridTile.writtenIndex) return false;
  return gridTile.kind === 'print' ? gridTile.tile.print.id === selection.printId : true;
}

/** The decklist as tiles, in the order of the text, each line's sibling tiles side by side. */
export function CardGrid({
  gridTiles,
  selection,
  isResolving,
  onSelect,
  onPickCandidate,
}: CardGridProps) {
  const { t } = useTranslation();
  const gridRef = useRef<HTMLUListElement>(null);
  const columns = useColumnCount(gridRef);
  // A tile can be selected from outside the grid, such as the first line to fix: bring it in.
  useEffect(() => {
    gridRef.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [selection?.writtenIndex, selection?.printId]);
  return (
    <ul
      ref={gridRef}
      aria-label={t('workspace.cardGrid')}
      className="grid content-start gap-y-3 p-1 pr-6 pb-4 pl-6"
      style={{
        columnGap: TILE_GAP_PX,
        gridTemplateColumns: `repeat(auto-fill, minmax(${TILE_MIN_WIDTH_PX}px, 1fr))`,
      }}
    >
      {gridTiles.map((gridTile, index) => {
        const selected = isSelected(gridTile, selection);
        const toggleSelection = (printId: string | null) =>
          onSelect(selected ? null : { writtenIndex: gridTile.writtenIndex, printId });
        return gridTile.kind === 'print' ? (
          <PrintTileCard
            key={gridTile.key}
            gridTile={gridTile}
            isSelected={selected}
            continuesRowAbove={gridTile.siblingIndex > 0 && index % columns === 0}
            onSelect={() => toggleSelection(gridTile.tile.print.id)}
          />
        ) : (
          <ImagelessTile
            key={gridTile.key}
            gridTile={gridTile}
            isResolving={isResolving}
            isSelected={selected}
            onSelect={() => toggleSelection(null)}
            onPickCandidate={(oracleId) => onPickCandidate(gridTile.writtenIndex, oracleId)}
          />
        );
      })}
    </ul>
  );
}
