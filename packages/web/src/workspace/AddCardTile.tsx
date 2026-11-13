import type { Candidate, DecklistSection, Lang } from '@mtg-suite/core';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CARD_SHAPE } from '../card-shape.ts';
import { GRID_CELL_FOCUS_RING, SECONDARY_BUTTON } from '../ui/board-styles.ts';
import {
  CenteredDialogContent,
  Dialog,
  DialogClose,
  DialogTitle,
  DialogTrigger,
} from '../ui/Dialog.tsx';
import { Icon } from '../ui/Icon.tsx';
import { CardSearchPanel } from './CardSearchPanel.tsx';
import { TILE_TAB_HEIGHT_PX } from './PrintTileCard.tsx';
import type { GridCellProps } from './use-grid-cell-focus.ts';

interface AddCardTileProps {
  readonly section: DecklistSection;
  /** The language the cards found are shown and added in. */
  readonly lang: Lang;
  /** Whether the tile says which section it adds to: where no section title above says it. */
  readonly namesItsSection?: boolean;
  /** The tile as a cell of the card grid, when it ends a section there. */
  readonly cell?: GridCellProps;
  readonly onAdd: (section: DecklistSection, candidate: Candidate) => void;
}

/**
 * The last element of a section of the card grid: it opens a search by name, and the card
 * picked there joins the section. Closing the search adds nothing.
 */
export function AddCardTile({
  section,
  lang,
  namesItsSection = false,
  cell,
  onAdd,
}: AddCardTileProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const sectionName = t(`workspace.sections.${section}`);
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <div style={{ paddingTop: TILE_TAB_HEIGHT_PX }}>
        <DialogTrigger
          {...cell}
          aria-label={t('workspace.addCard.open', { section: sectionName })}
          style={CARD_SHAPE}
          className={`${GRID_CELL_FOCUS_RING} flex w-full flex-col items-center justify-center gap-1 border-2 border-dashed border-border bg-panel/50 text-sm font-semibold text-muted-foreground hover:border-accent hover:text-foreground`}
        >
          <Icon name="plus" className="size-8" />
          {namesItsSection
            ? t('workspace.addCard.tileOfSection', { section: sectionName })
            : t('workspace.addCard.tile')}
        </DialogTrigger>
      </div>
      <CenteredDialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-3 overflow-y-auto">
        <DialogTitle className="font-semibold">
          {t('workspace.addCard.title', { section: sectionName })}
        </DialogTitle>
        <CardSearchPanel
          lang={lang}
          onPick={(candidate) => {
            onAdd(section, candidate);
            setIsOpen(false);
          }}
        />
        <DialogClose className={`${SECONDARY_BUTTON} self-end text-sm`}>
          {t('workspace.addCard.close')}
        </DialogClose>
      </CenteredDialogContent>
    </Dialog>
  );
}
