import type { Candidate, Lang } from '@mtg-suite/core';
import { useEffect, useState } from 'react';
import { searchCardsByName } from '../api.ts';
import { SEARCH_TYPING_WAIT_MS } from '../search-typing-wait.ts';

/**
 * How many characters a name needs before it is searched: fewer match too many cards for the
 * trigram index to narrow them down (ADR 0003).
 */
export const MIN_CARD_SEARCH_LENGTH = 2;

/** Where a name search stands: too little typed, on its way, answered, or failed. */
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
 * for `SEARCH_TYPING_WAIT_MS`: an answer to an older query never shows.
 */
export function useCardSearch(query: string, lang: Lang): CardSearchState {
  const trimmed = query.trim();
  const searchKey = `${lang}:${trimmed}`;
  const [answer, setAnswer] = useState<Answer | null>(null);
  useEffect(() => {
    if (trimmed.length < MIN_CARD_SEARCH_LENGTH) return;
    let isCurrent = true;
    const timer = setTimeout(() => {
      searchCardsByName(trimmed, lang).then(
        (cards) => isCurrent && setAnswer({ searchKey, state: { status: 'found', cards } }),
        () => isCurrent && setAnswer({ searchKey, state: { status: 'failed' } }),
      );
    }, SEARCH_TYPING_WAIT_MS);
    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [trimmed, lang, searchKey]);
  if (trimmed.length < MIN_CARD_SEARCH_LENGTH) return { status: 'idle' };
  return answer?.searchKey === searchKey ? answer.state : { status: 'searching' };
}
