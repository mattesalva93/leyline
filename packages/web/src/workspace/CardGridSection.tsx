import type { Candidate, DecklistSection, Lang, LineSide, Print } from '@mtg-suite/core';
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ZoomOn } from '../use-zoomed-card.tsx';
import { AddCardTile } from './AddCardTile.tsx';
import type { GridSection } from './grid-sections.ts';
import { dropMarkSideOf, isSelected, type GridTile, type TileSelection } from './grid-tiles.ts';
import { ImagelessTile } from './ImagelessTile.tsx';
import { PrintTileCard, TILE_GAP_PX } from './PrintTileCard.tsx';
import { ReorderableTileItem } from './ReorderableTileItem.tsx';
import type { LineDrag } from './use-line-drag.ts';

export interface CardGridSectionProps {
  readonly section: GridSection;
  /** The narrowest a tile gets, in CSS px: the grid stretches tiles to fill its rows. */
  readonly tileWidthPx: number;
  readonly selection: TileSelection | null;
  readonly isResolving: boolean;
  readonly zoomOn: ZoomOn;
  /** `null` where touch is the main input: there no tile can be dragged. */
  readonly lineDrag: LineDrag | null;
  readonly onSelect: (selection: TileSelection | null) => void;
  readonly onPickCandidate: (writtenIndex: number, oracleId: string) => void;
  readonly onTileQuantityChange: (writtenIndex: number, print: Print, quantity: number) => void;
  /** The language the add tile shows and adds cards in. */
  readonly defaultLang: Lang;
  readonly onAddCard: (section: DecklistSection, candidate: Candidate) => void;
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

/** The side of `gridTile` where the bar of the dragged line stands, if it lands by the tile. */
function dropMarkOf(gridTile: GridTile, lineDrag: LineDrag | null): LineSide | null {
  const nextTo = lineDrag?.destination?.nextTo;
  return nextTo?.writtenIndex === gridTile.writtenIndex
    ? dropMarkSideOf(gridTile, nextTo.side)
    : null;
}

/** One section of the card grid: its title with its card count, then its tiles, then the add tile. */
export function CardGridSection({
  section,
  tileWidthPx,
  selection,
  isResolving,
  zoomOn,
  lineDrag,
  onSelect,
  onPickCandidate,
  onTileQuantityChange,
  defaultLang,
  onAddCard,
}: CardGridSectionProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const gridRef = useRef<HTMLUListElement>(null);
  const columns = useColumnCount(gridRef);
  return (
    <section aria-labelledby={titleId}>
      <h2 id={titleId} className="px-6 pt-3 pb-2 font-semibold">
        {t(`workspace.sections.${section.name}`)}{' '}
        <span className="text-sm font-normal text-muted-foreground">
          {t('workspace.cardCount', { count: section.cardCount })}
        </span>
      </h2>
      <ul
        ref={gridRef}
        className="grid content-start gap-y-3 p-1 pr-6 pb-4 pl-6"
        style={{
          columnGap: TILE_GAP_PX,
          gridTemplateColumns: `repeat(auto-fill, minmax(${tileWidthPx}px, 1fr))`,
        }}
      >
        {section.gridTiles.map((gridTile, index) => {
          const selected = isSelected(gridTile, selection);
          const toggleSelection = (printId: string | null) =>
            onSelect(selected ? null : { writtenIndex: gridTile.writtenIndex, printId });
          const tileContent =
            gridTile.kind === 'print' ? (
              <PrintTileCard
                gridTile={gridTile}
                isSelected={selected}
                continuesRowAbove={gridTile.siblingIndex > 0 && index % columns === 0}
                zoomOn={zoomOn}
                onSelect={() => toggleSelection(gridTile.tile.print.id)}
                onQuantityChange={(quantity) =>
                  onTileQuantityChange(gridTile.writtenIndex, gridTile.tile.print, quantity)
                }
              />
            ) : (
              <ImagelessTile
                gridTile={gridTile}
                isResolving={isResolving}
                isSelected={selected}
                onSelect={() => toggleSelection(null)}
                onPickCandidate={(oracleId) => onPickCandidate(gridTile.writtenIndex, oracleId)}
              />
            );
          return (
            <ReorderableTileItem
              key={gridTile.key}
              isSelected={selected}
              dragHandlers={lineDrag?.tileDragHandlers(gridTile, section.name) ?? null}
              isDragged={lineDrag?.draggedWrittenIndex === gridTile.writtenIndex}
              dropMarkSide={dropMarkOf(gridTile, lineDrag)}
            >
              {tileContent}
            </ReorderableTileItem>
          );
        })}
        <li>
          <AddCardTile section={section.name} lang={defaultLang} onAdd={onAddCard} />
        </li>
      </ul>
    </section>
  );
}
