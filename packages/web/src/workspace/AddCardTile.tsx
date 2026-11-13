import {
  SECTION_BEFORE_ANY_HEADER,
  type Candidate,
  type DecklistSection,
  type Lang,
} from '@mtg-suite/core';
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
import { SectionPicker } from './SectionPicker.tsx';
import { pileFreeTileFrame } from './CopyPile.tsx';
import { TILE_TAB_HEIGHT_PX } from './PrintTileCard.tsx';
import type { GridCellProps } from './use-grid-cell-focus.ts';

interface AddCardTileProps {
  /**
   * The section the search starts on, the one the tile ends. `null` for the only tile of a
   * decklist with no card: it names no section and starts on the section a line above every header belongs to.
   */
  readonly section: DecklistSection | null;
  /** The language the cards found are shown and added in. */
  readonly lang: Lang;
  /** The tile as a cell of the card grid, when it ends a section there. */
  readonly cell?: GridCellProps;
  readonly onAdd: (section: DecklistSection, candidate: Candidate) => void;
}

/**
 * The last element of a section of the card grid: it opens a search by name, and the card
 * picked there joins the section, or the one picked above the search. Each opening starts on
 * the tile's own section. Closing the search adds nothing.
 */
export function AddCardTile({ section, lang, cell, onAdd }: AddCardTileProps) {
  const { t } = useTranslation();
  const startSection = section ?? SECTION_BEFORE_ANY_HEADER;
  const [isOpen, setIsOpen] = useState(false);
  const [pickedSection, setPickedSection] = useState<DecklistSection>(startSection);
  // The only tile of an empty decklist has no section title above it to name, so names none.
  const [tileLabel, tileText] = section
    ? [
        t('workspace.addCard.open', { section: t(`workspace.sections.${section}`) }),
        t('workspace.addCard.tile'),
      ]
    : [t('workspace.addCard.tileOfNoSection'), t('workspace.addCard.tileOfNoSection')];
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (open) setPickedSection(startSection);
        setIsOpen(open);
      }}
    >
      <div style={pileFreeTileFrame(TILE_TAB_HEIGHT_PX)}>
        <DialogTrigger
          {...cell}
          aria-label={tileLabel}
          style={CARD_SHAPE}
          className={`${GRID_CELL_FOCUS_RING} flex w-full flex-col items-center justify-center gap-1 border-2 border-dashed border-border bg-panel/50 text-sm font-semibold text-muted-foreground hover:border-accent hover:text-foreground`}
        >
          <Icon name="plus" className="size-8" />
          {tileText}
        </DialogTrigger>
      </div>
      <CenteredDialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-3 overflow-y-auto">
        <DialogTitle className="font-semibold">
          {t('workspace.addCard.title', {
            section: t(`workspace.sections.${pickedSection}`),
          })}
        </DialogTitle>
        <SectionPicker selectedSection={pickedSection} onChange={setPickedSection} />
        <CardSearchPanel
          lang={lang}
          onPick={(candidate) => {
            onAdd(pickedSection, candidate);
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
