import type { Lang, Print } from '@mtg-suite/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchPrintPage } from './api.ts';
import { printPageSizeForWindow } from './print-page-size.ts';

export interface PrintPages {
  /** Every print loaded so far, newest first. */
  readonly prints: readonly Print[];
  /** How many prints the card has in all; `null` until the first page arrives. */
  readonly total: number | null;
  readonly hasMore: boolean;
  readonly isLoading: boolean;
  readonly lastRequestFailed: boolean;
  /** Asks for the next page, unless one is on its way or none is left. */
  readonly loadMore: () => void;
}

interface LoadedPages {
  readonly key: string;
  readonly prints: readonly Print[];
  readonly total: number | null;
  readonly nextCursor: string | null;
}

/**
 * The prints the card `oracleId` can print with in `lang`, loaded a page at a time; the first
 * page is asked for as soon as there is a card, so its total is ready before the picker opens.
 */
export function usePrintPages(oracleId: string | null, lang: Lang): PrintPages {
  const key = oracleId === null ? '' : `${oracleId}:${lang}`;
  const [loaded, setLoaded] = useState<LoadedPages | null>(null);
  const [requestInFlight, setRequestInFlight] = useState(false);
  const [lastRequestFailed, setLastRequestFailed] = useState(false);
  // The key of the request on its way: a page for another card or language is dropped.
  const currentKey = useRef(key);
  currentKey.current = key;
  const current = loaded?.key === key ? loaded : null;

  const loadPage = useCallback(
    async (cursor: string | null, previous: readonly Print[]) => {
      if (oracleId === null) return;
      const requestKey = `${oracleId}:${lang}`;
      setRequestInFlight(true);
      try {
        const page = await fetchPrintPage(oracleId, lang, printPageSizeForWindow(), cursor);
        if (currentKey.current !== requestKey) return;
        setLoaded({
          key: requestKey,
          prints: [...previous, ...page.prints],
          total: page.total,
          nextCursor: page.nextCursor,
        });
        setLastRequestFailed(false);
      } catch {
        if (currentKey.current === requestKey) setLastRequestFailed(true);
      } finally {
        if (currentKey.current === requestKey) setRequestInFlight(false);
      }
    },
    [oracleId, lang],
  );

  useEffect(() => {
    setRequestInFlight(false);
    setLastRequestFailed(false);
    void loadPage(null, []);
  }, [loadPage]);

  const hasMore = current === null || current.nextCursor !== null;
  const loadMore = useCallback(() => {
    if (requestInFlight || !hasMore) return;
    void loadPage(current?.nextCursor ?? null, current?.prints ?? []);
  }, [requestInFlight, hasMore, loadPage, current]);

  return {
    prints: current?.prints ?? [],
    total: current?.total ?? null,
    hasMore,
    isLoading: requestInFlight,
    lastRequestFailed,
    loadMore,
  };
}
