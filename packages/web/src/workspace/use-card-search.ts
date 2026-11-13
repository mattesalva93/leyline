import type { Candidate, Lang } from '@mtg-suite/core';
import { useEffect, useState } from 'react';
import { searchCardsByName } from '../api.ts';

/** How long the user may pause between two keys before the search starts, in ms. */
export const CARD_SEARCH_WAIT_MS = 250;

/** Where a name search stands: nothing typed, on its way, answered, or failed. */
export type CardSearchState =
  | { readonly status: 'idle' }
  | { readonly status: 'searching' }
  | { readonly status: 'found'; readonly cards: readonly Candidate[] }
  | { readonly status: 'failed' };

/** The answer to one search, named by what it searched for. */
interface Answer {
  readonly searchKey: string;
  readonly state: CardSearchState;
}

/**
 * The cards whose name comes close to `query`, in `lang`, searched once the user stops typing
 * for `CARD_SEARCH_WAIT_MS`: an answer to an older query never shows.
 */
export function useCardSearch(query: string, lang: Lang): CardSearchState {
  const trimmed = query.trim();
  const searchKey = `${lang}:${trimmed}`;
  const [answer, setAnswer] = useState<Answer | null>(null);
  useEffect(() => {
    if (trimmed === '') return;
    let isCurrent = true;
    const timer = setTimeout(() => {
      searchCardsByName(trimmed, lang).then(
        (cards) => isCurrent && setAnswer({ searchKey, state: { status: 'found', cards } }),
        () => isCurrent && setAnswer({ searchKey, state: { status: 'failed' } }),
      );
    }, CARD_SEARCH_WAIT_MS);
    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [trimmed, lang, searchKey]);
  if (trimmed === '') return { status: 'idle' };
  return answer?.searchKey === searchKey ? answer.state : { status: 'searching' };
}
