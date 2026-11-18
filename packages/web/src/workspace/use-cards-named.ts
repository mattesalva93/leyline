import type { Candidate, Lang } from '@mtg-suite/core';
import { useEffect, useState } from 'react';
import { fetchCardsNamed } from '../api.ts';

/** Where the listing of the cards sharing a name stands. */
type CardsNamedState =
  | { readonly status: 'loading' }
  | { readonly status: 'found'; readonly cards: readonly Candidate[] }
  | { readonly status: 'failed' };

/** Every card a line naming `name` could mean, in `lang`: an answer for another name never shows. */
export function useCardsNamed(name: string, lang: Lang): CardsNamedState {
  const listingKey = `${lang}:${name}`;
  const [answer, setAnswer] = useState<{ listingKey: string; state: CardsNamedState } | null>(null);
  useEffect(() => {
    let isCurrent = true;
    fetchCardsNamed(name, lang).then(
      (cards) => isCurrent && setAnswer({ listingKey, state: { status: 'found', cards } }),
      () => isCurrent && setAnswer({ listingKey, state: { status: 'failed' } }),
    );
    return () => {
      isCurrent = false;
    };
  }, [name, lang, listingKey]);
  return answer?.listingKey === listingKey ? answer.state : { status: 'loading' };
}
