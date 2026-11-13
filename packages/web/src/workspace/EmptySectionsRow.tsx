import type { Candidate, DecklistSection, Lang } from '@mtg-suite/core';
import { useTranslation } from 'react-i18next';
import { AddCardTile } from './AddCardTile.tsx';
import { addTileKeyOf } from './grid-sections.ts';
import { TILE_GRID_CLASS, tileGridStyle } from './tile-grid.ts';
import { useColumnCount } from './use-column-count.ts';
import { cellGroupProps, type CellPropsOf } from './use-grid-cell-focus.ts';

interface EmptySectionsRowProps {
  /** The sections with no card, which the card grid shows no title for. */
  readonly emptySections: readonly DecklistSection[];
  readonly tileWidthPx: number;
  readonly lang: Lang;
  readonly cellPropsOf: CellPropsOf;
  readonly onAddCard: (section: DecklistSection, candidate: Candidate) => void;
}

/**
 * After the sections of the card grid, an add tile for each section with no card yet, named on
 * the tile since such a section has no title: adding a card opens it.
 */
export function EmptySectionsRow({
  emptySections,
  tileWidthPx,
  lang,
  cellPropsOf,
  onAddCard,
}: EmptySectionsRowProps) {
  const { t } = useTranslation();
  const { gridRef, columns } = useColumnCount();
  if (emptySections.length === 0) return null;
  return (
    <ul
      ref={gridRef}
      role="group"
      aria-label={t('workspace.addCard.emptySections')}
      className={`${TILE_GRID_CLASS} border-t-2 border-dashed border-border/40 pt-3`}
      style={tileGridStyle(tileWidthPx)}
      {...cellGroupProps(columns)}
    >
      {emptySections.map((section) => (
        <li key={section}>
          <AddCardTile
            section={section}
            lang={lang}
            namesItsSection
            cell={cellPropsOf(addTileKeyOf(section))}
            onAdd={onAddCard}
          />
        </li>
      ))}
    </ul>
  );
}
