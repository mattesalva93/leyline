import type { Lang, Print } from '@mtg-suite/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchPrintPage } from './api.ts';

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
  /** The card and language the pages are of, as `pagesKeyOf` names them. */
  readonly pagesKey: string | null;
  readonly prints: readonly Print[];
  readonly total: number | null;
  readonly nextCursor: string | null;
}

const NOTHING_LOADED: LoadedPages = { pagesKey: null, prints: [], total: null, nextCursor: null };

function pagesKeyOf(oracleId: string | null, lang: Lang): string | null {
  return oracleId === null ? null : `${lang}:${oracleId}`;
}

/**
 * The prints the card `oracleId` can print with in `lang`, loaded a page at a time; the first
 * page is asked for as soon as there is a card, so its total is ready before the picker opens.
 * `pageSize` says, when each request leaves, how many prints to ask for.
 */
export function usePrintPages(
  oracleId: string | null,
  lang: Lang,
  pageSize: () => number,
): PrintPages {
  const [loaded, setLoaded] = useState<LoadedPages>(NOTHING_LOADED);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRequestFailed, setLastRequestFailed] = useState(false);
  // Numbers every request: only the latest one may update the state, so a late answer for
  // another card, another language or an older page never lands.
  const latestRequest = useRef(0);
  // Read and set synchronously: two scroll events before a re-render must not ask twice.
  const requestInFlight = useRef(false);
  // The pages already loaded, for `loadMore` to append to without waiting for a re-render.
  const loadedRef = useRef(loaded);
  // The latest `pageSize`, read when a request leaves: a new function must not reload pages.
  const pageSizeRef = useRef(pageSize);
  useEffect(() => {
    pageSizeRef.current = pageSize;
  });
  const pagesKey = pagesKeyOf(oracleId, lang);

  const loadPage = useCallback(
    async (previous: LoadedPages) => {
      if (oracleId === null) return;
      const request = ++latestRequest.current;
      requestInFlight.current = true;
      setIsLoading(true);
      try {
        const page = await fetchPrintPage(
          oracleId,
          lang,
          pageSizeRef.current(),
          previous.nextCursor,
        );
        if (request !== latestRequest.current) return;
        const next = {
          pagesKey: pagesKeyOf(oracleId, lang),
          prints: [...previous.prints, ...page.prints],
          total: page.total,
          nextCursor: page.nextCursor,
        };
        loadedRef.current = next;
        setLoaded(next);
        setLastRequestFailed(false);
      } catch {
        if (request === latestRequest.current) setLastRequestFailed(true);
      } finally {
        if (request === latestRequest.current) {
          requestInFlight.current = false;
          setIsLoading(false);
        }
      }
    },
    [oracleId, lang],
  );

  // Another card or language starts over from its first page.
  useEffect(() => {
    // Drops whatever is on its way, even when no card follows (the panel closed).
    latestRequest.current += 1;
    requestInFlight.current = false;
    setIsLoading(false);
    loadedRef.current = NOTHING_LOADED;
    setLoaded(NOTHING_LOADED);
    setLastRequestFailed(false);
    void loadPage(NOTHING_LOADED);
  }, [loadPage]);

  const loadMore = useCallback(() => {
    const current = loadedRef.current;
    if (requestInFlight.current || (current.total !== null && current.nextCursor === null)) return;
    // Pages of another card or language: their first page is on its way.
    if (current !== NOTHING_LOADED && current.pagesKey !== pagesKeyOf(oracleId, lang)) return;
    void loadPage(current);
  }, [loadPage, oracleId, lang]);

  // Until the first page of another card or language starts over, the old pages never show.
  if (loaded.pagesKey !== pagesKey && loaded !== NOTHING_LOADED) {
    return {
      prints: [],
      total: null,
      hasMore: true,
      isLoading: true,
      lastRequestFailed: false,
      loadMore,
    };
  }
  return {
    prints: loaded.prints,
    total: loaded.total,
    hasMore: loaded.total === null || loaded.nextCursor !== null,
    isLoading,
    lastRequestFailed,
    loadMore,
  };
}
