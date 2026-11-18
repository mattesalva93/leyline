import { searchRowsOf, type Candidate, type Lang, type SearchRow } from '@mtg-suite/core';
import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CARD_SHAPE } from '../card-image/card-shape.ts';
import { SMALL_IMAGE } from '../card-image/scryfall-image-sizes.ts';
import { FIELD } from '../../ui/board-styles.ts';
import { Icon } from '../../ui/Icon.tsx';
import { SameNameVersionGrid } from './SameNameVersionGrid.tsx';
import { useCardSearch } from './use-card-search.ts';

interface CardSearchPanelProps {
  readonly lang: Lang;
  readonly onPick: (candidate: Candidate) => void;
}

/**
 * A field to search a card by name and the cards found, each with its image. A name several
 * cards share is one row, which opens the grid of all of them. The arrows go through the rows
 * and Enter takes the one they rest on, the first if none.
 */
export function CardSearchPanel({ lang, onPick }: CardSearchPanelProps) {
  const { t } = useTranslation();
  const listId = useId();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [openedName, setOpenedName] = useState<string | null>(null);
  const search = useCardSearch(query, lang);
  const rows = search.status === 'found' ? searchRowsOf(search.cards) : [];
  const optionId = (index: number) => `${listId}-${index}`;
  const activeOptionId = activeIndex >= 0 ? optionId(activeIndex) : undefined;
  // The list scrolls when the cards found outgrow it: the arrows must not pick an unseen one.
  useEffect(() => {
    if (activeOptionId)
      document.getElementById(activeOptionId)?.scrollIntoView({ block: 'nearest' });
  }, [activeOptionId]);

  function take(row: SearchRow) {
    if (row.kind === 'card') onPick(row.candidate);
    else setOpenedName(row.name);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    // A key that composes a character (an IME, a dead key) is the user still typing.
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((index) => Math.min(Math.max(index + step, 0), rows.length - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const row = rows[Math.max(activeIndex, 0)];
      if (row) take(row);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        role="combobox"
        // The field, not the controls above it, is where a search starts.
        autoFocus
        aria-label={t('workspace.addCard.nameField')}
        aria-expanded={openedName === null && rows.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={openedName === null ? activeOptionId : undefined}
        placeholder={t('workspace.addCard.namePlaceholder')}
        autoComplete="off"
        className={FIELD}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveIndex(-1);
          setOpenedName(null);
        }}
        onKeyDown={onKeyDown}
      />
      {openedName !== null ? (
        <SameNameVersionGrid
          name={openedName}
          lang={lang}
          onBack={() => setOpenedName(null)}
          onPick={onPick}
        />
      ) : (
        <>
          <p aria-live="polite" className="text-xs text-muted-foreground empty:hidden">
            {search.status === 'searching' && t('workspace.addCard.searching')}
            {search.status === 'failed' && t('workspace.addCard.failed')}
            {search.status === 'found' && rows.length === 0 && t('workspace.addCard.noResults')}
          </p>
          <ul
            id={listId}
            role="listbox"
            aria-label={t('workspace.addCard.results')}
            className="flex max-h-[60dvh] flex-col gap-1 overflow-y-auto empty:hidden"
          >
            {rows.map((row, index) => (
              <SearchRowOption
                key={row.kind === 'card' ? row.candidate.card.oracleId : `name:${row.name}`}
                id={optionId(index)}
                row={row}
                isActive={index === activeIndex}
                onTake={() => take(row)}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function SearchRowOption({
  id,
  row,
  isActive,
  onTake,
}: {
  readonly id: string;
  readonly row: SearchRow;
  readonly isActive: boolean;
  readonly onTake: () => void;
}) {
  const { t } = useTranslation();
  const { card, defaultPrint } = row.kind === 'card' ? row.candidate : row.first;
  const name = row.kind === 'card' ? card.name : row.name;
  const image = defaultPrint?.faces[0]?.imageUris.small;
  const printedName = row.kind === 'card' ? defaultPrint?.printedName : undefined;
  return (
    <li
      id={id}
      role="option"
      aria-label={
        row.kind === 'card'
          ? name
          : t('workspace.addCard.sharedName', { name, count: row.cardCount })
      }
      aria-selected={isActive}
      className={`flex cursor-pointer items-center gap-3 rounded-md border-2 p-1 ${isActive ? 'border-accent bg-accent/20' : 'border-transparent hover:border-border'}`}
      // Keeps the focus in the field, where the keyboard keeps working.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onTake}
    >
      {image ? (
        <img
          src={image}
          alt={t('line.imageAlt', { name })}
          width={SMALL_IMAGE.width}
          height={SMALL_IMAGE.height}
          className="h-auto w-12 rounded-sm"
        />
      ) : (
        <span style={CARD_SHAPE} className="w-12 border-2 border-dashed border-border" />
      )}
      <span className="flex flex-1 flex-col">
        <span className="font-semibold">{name}</span>
        {printedName && printedName !== card.name && (
          <span className="text-xs text-muted-foreground">{printedName}</span>
        )}
        {row.kind === 'sharedName' && (
          <span className="text-xs text-muted-foreground">
            {t('workspace.addCard.sharedNameHint', { count: row.cardCount })}
          </span>
        )}
      </span>
      {row.kind === 'sharedName' && <Icon name="chevronRight" className="size-4" />}
    </li>
  );
}
