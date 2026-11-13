import type { Candidate, Lang } from '@mtg-suite/core';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SMALL_IMAGE } from '../scryfall-image-sizes.ts';
import { FIELD } from '../ui/board-styles.ts';
import { useCardSearch } from './use-card-search.ts';

interface CardSearchPanelProps {
  readonly lang: Lang;
  readonly onPick: (candidate: Candidate) => void;
}

/**
 * A field to search a card by name and the cards found, each with its image. The arrows go
 * through the cards found and Enter picks the one they rest on, the first if none.
 */
export function CardSearchPanel({ lang, onPick }: CardSearchPanelProps) {
  const { t } = useTranslation();
  const listId = useId();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const search = useCardSearch(query, lang);
  const cards = search.status === 'found' ? search.cards : [];
  const optionId = (index: number) => `${listId}-${index}`;

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((index) => Math.min(Math.max(index + step, 0), cards.length - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const picked = cards[Math.max(activeIndex, 0)];
      if (picked) onPick(picked);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        role="combobox"
        aria-label={t('workspace.addCard.nameField')}
        aria-expanded={cards.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
        placeholder={t('workspace.addCard.namePlaceholder')}
        autoComplete="off"
        className={FIELD}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveIndex(-1);
        }}
        onKeyDown={onKeyDown}
      />
      <p aria-live="polite" className="text-xs text-muted-foreground empty:hidden">
        {search.status === 'searching' && t('workspace.addCard.searching')}
        {search.status === 'failed' && t('workspace.addCard.failed')}
        {search.status === 'found' && cards.length === 0 && t('workspace.addCard.noResults')}
      </p>
      <ul
        id={listId}
        role="listbox"
        aria-label={t('workspace.addCard.results')}
        className="flex max-h-[60dvh] flex-col gap-1 overflow-y-auto empty:hidden"
      >
        {cards.map((candidate, index) => {
          const { card, defaultPrint } = candidate;
          const image = defaultPrint?.faces[0]?.imageUris.small;
          const printedName = defaultPrint?.printedName;
          return (
            <li
              key={card.oracleId}
              id={optionId(index)}
              role="option"
              aria-label={card.name}
              aria-selected={index === activeIndex}
              className={`flex cursor-pointer items-center gap-3 rounded-md border-2 p-1 ${index === activeIndex ? 'border-accent bg-accent/20' : 'border-transparent hover:border-border'}`}
              // Keeps the focus in the field, where the keyboard keeps working.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onPick(candidate)}
            >
              {image ? (
                <img
                  src={image}
                  alt={t('line.imageAlt', { name: card.name })}
                  width={SMALL_IMAGE.width}
                  height={SMALL_IMAGE.height}
                  className="h-auto w-12 rounded-sm"
                />
              ) : (
                <span className="h-17 w-12 rounded-sm border-2 border-dashed border-border" />
              )}
              <span className="flex flex-col">
                <span className="font-semibold">{card.name}</span>
                {printedName && printedName !== card.name && (
                  <span className="text-xs text-muted-foreground">{printedName}</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
