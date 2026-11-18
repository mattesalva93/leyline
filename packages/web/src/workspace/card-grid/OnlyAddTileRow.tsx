import type { Candidate, DecklistSection, Lang } from '@mtg-suite/core';
import { AddCardTile } from '../add-card/AddCardTile.tsx';
import { ONLY_ADD_TILE_KEY } from './grid-sections.ts';
import { TILE_GRID_CLASS, tileGridStyle } from './tile-grid.ts';
import { useGridColumns } from './use-grid-columns.ts';
import { cellGroupProps, type CellPropsOf } from './use-grid-cell-focus.ts';

interface OnlyAddTileRowProps {
  readonly tileWidthPx: number;
  readonly lang: Lang;
  readonly cellPropsOf: CellPropsOf;
  readonly onAddCard: (section: DecklistSection, candidate: Candidate) => void;
}

/** The card grid of a decklist with no card: a lone add tile, naming no section. */
export function OnlyAddTileRow({ tileWidthPx, lang, cellPropsOf, onAddCard }: OnlyAddTileRowProps) {
  const { gridRef, columns } = useGridColumns();
  return (
    <ul
      ref={gridRef}
      className={`${TILE_GRID_CLASS} pt-3`}
      style={tileGridStyle(tileWidthPx)}
      {...cellGroupProps(columns)}
    >
      <li>
        <AddCardTile
          section={null}
          lang={lang}
          cell={cellPropsOf(ONLY_ADD_TILE_KEY)}
          onAdd={onAddCard}
        />
      </li>
    </ul>
  );
}
