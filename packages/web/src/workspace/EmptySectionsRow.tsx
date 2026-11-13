import {
  DECKLIST_SECTIONS,
  type Candidate,
  type DecklistSection,
  type Lang,
} from '@mtg-suite/core';
import { useTranslation } from 'react-i18next';
import { AddCardTile } from './AddCardTile.tsx';
import { TILE_GRID_CLASS, tileGridStyle } from './tile-grid.ts';

interface EmptySectionsRowProps {
  /** The sections the card grid shows: every other one gets an add tile here. */
  readonly shownSections: readonly DecklistSection[];
  readonly tileWidthPx: number;
  readonly lang: Lang;
  readonly onAddCard: (section: DecklistSection, candidate: Candidate) => void;
}

/**
 * After the sections of the card grid, an add tile for each section with no card yet, named on
 * the tile since such a section has no title: adding a card opens it.
 */
export function EmptySectionsRow({
  shownSections,
  tileWidthPx,
  lang,
  onAddCard,
}: EmptySectionsRowProps) {
  const { t } = useTranslation();
  const emptySections = DECKLIST_SECTIONS.filter((name) => !shownSections.includes(name));
  if (emptySections.length === 0) return null;
  return (
    <ul
      role="group"
      aria-label={t('workspace.addCard.emptySections')}
      className={`${TILE_GRID_CLASS} border-t-2 border-dashed border-border/40 pt-3`}
      style={tileGridStyle(tileWidthPx)}
    >
      {emptySections.map((section) => (
        <li key={section}>
          <AddCardTile section={section} lang={lang} namesItsSection onAdd={onAddCard} />
        </li>
      ))}
    </ul>
  );
}
