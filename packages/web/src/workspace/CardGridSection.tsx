import type { Candidate, DecklistSection, Lang, LineSide, Print } from '@mtg-suite/core';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ZoomOn } from '../use-zoomed-card.tsx';
import { AddCardTile } from './AddCardTile.tsx';
import { addTileKeyOf, type GridSection } from './grid-sections.ts';
import { dropMarkSideOf, isSelected, type GridTile, type TileSelection } from './grid-tiles.ts';
import { ImagelessTile } from './ImagelessTile.tsx';
import { PrintTileCard } from './PrintTileCard.tsx';
import { ReorderableTileItem } from './ReorderableTileItem.tsx';
import { siblingGroupColoursOf } from './sibling-group-colours.ts';
import { tileCellLabel, tileKeyHandler } from './tile-cell.ts';
import { TILE_GRID_CLASS, tileGridStyle } from './tile-grid.ts';
import { useColumnCount } from './use-column-count.ts';
import { cellGroupProps, type CellPropsOf } from './use-grid-cell-focus.ts';
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
  /** Selects the tile and takes the focus to its line's panel, as Enter on the tile does. */
  readonly onOpenLinePanel: (selection: TileSelection) => void;
  readonly cellPropsOf: CellPropsOf;
  readonly onPickCandidate: (writtenIndex: number, oracleId: string) => void;
  readonly onTileQuantityChange: (writtenIndex: number, print: Print, quantity: number) => void;
  /** The language the add tile shows and adds cards in. */
  readonly defaultLang: Lang;
  readonly onAddCard: (section: DecklistSection, candidate: Candidate) => void;
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
  onOpenLinePanel,
  cellPropsOf,
  onPickCandidate,
  onTileQuantityChange,
  defaultLang,
  onAddCard,
}: CardGridSectionProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const { gridRef, columns } = useColumnCount();
  const siblingGroupColours = siblingGroupColoursOf(section.gridTiles, columns);
  const [flippedTileKeys, setFlippedTileKeys] = useState<ReadonlySet<string>>(new Set());
  const flip = (tileKey: string) =>
    setFlippedTileKeys((keys) => {
      const flipped = new Set(keys);
      if (!flipped.delete(tileKey)) flipped.add(tileKey);
      return flipped;
    });
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
        className={TILE_GRID_CLASS}
        style={tileGridStyle(tileWidthPx)}
        {...cellGroupProps(columns)}
      >
        {section.gridTiles.map((gridTile, index) => {
          const selected = isSelected(gridTile, selection);
          const toggleSelection = (printId: string | null) =>
            onSelect(selected ? null : { writtenIndex: gridTile.writtenIndex, printId });
          const printId = gridTile.kind === 'print' ? gridTile.tile.print.id : null;
          const isFlipped = flippedTileKeys.has(gridTile.key);
          const isDoubleFaced = gridTile.kind === 'print' && gridTile.tile.print.faces.length > 1;
          const cell = {
            ...cellPropsOf(gridTile.key),
            'aria-label': tileCellLabel(gridTile, isFlipped, t),
            onKeyDown: tileKeyHandler({
              onOpen: () => onOpenLinePanel({ writtenIndex: gridTile.writtenIndex, printId }),
              onQuantityStep:
                gridTile.kind === 'print'
                  ? (step) =>
                      onTileQuantityChange(
                        gridTile.writtenIndex,
                        gridTile.tile.print,
                        gridTile.tile.quantity + step,
                      )
                  : null,
              onFlip: isDoubleFaced ? () => flip(gridTile.key) : null,
            }),
          };
          const tileContent =
            gridTile.kind === 'print' ? (
              <PrintTileCard
                gridTile={gridTile}
                siblingColour={siblingGroupColours.get(gridTile.writtenIndex)}
                isSelected={selected}
                isFlipped={isFlipped}
                onFlip={() => flip(gridTile.key)}
                continuesRowAbove={gridTile.siblingIndex > 0 && index % columns === 0}
                zoomOn={zoomOn}
                onSelect={() => toggleSelection(printId)}
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
              cell={cell}
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
          <AddCardTile
            section={section.name}
            lang={defaultLang}
            cell={cellPropsOf(addTileKeyOf(section.name))}
            onAdd={onAddCard}
          />
        </li>
      </ul>
    </section>
  );
}
