import {
  CARD_SEARCH_LIMIT,
  countPrintsByLang,
  createInMemoryCatalog,
  listPrints,
  resolveDecklist,
  searchCards,
  suggestTokens,
  type CatalogEntry,
  type TokenLink,
} from '@mtg-suite/core';
import type * as api from './api.ts';

const TODAY = '2026-01-01';

/**
 * Stands in for the `api.ts` module in tests: the same calls, answered by `core` from a catalog
 * that holds `entries` and the tokens of `tokenLinks`, with no network.
 */
export function inMemoryServer(
  entries: readonly CatalogEntry[],
  tokenLinks: readonly TokenLink[] = [],
): typeof api {
  const catalog = createInMemoryCatalog(entries, tokenLinks);
  return {
    resolveDecklistText: (text, lang) => resolveDecklist(text, catalog, { today: TODAY, lang }),
    fetchSuggestedTokens: (lines, lang) => suggestTokens(catalog, lines, { today: TODAY, lang }),
    fetchImages: async (urls, onImageFetched = () => {}) => {
      urls.forEach((_url, index) => onImageFetched(index + 1));
      return new Map(urls.map((url) => [url, new Uint8Array()]));
    },
    searchCardsByName: (query, lang) =>
      searchCards(catalog, { query, lang, today: TODAY, limit: CARD_SEARCH_LIMIT }),
    fetchPrintPage: async (oracleId, lang, limit, cursor, printQuery) => {
      const page = await listPrints(catalog, {
        oracleId,
        lang,
        today: TODAY,
        limit,
        cursor,
        query: printQuery,
      });
      if (!page) throw new Error(`No card ${oracleId}`);
      return page;
    },
    fetchPrintCounts: async (oracleId) => {
      const counts = await countPrintsByLang(catalog, { oracleId, today: TODAY });
      if (!counts) throw new Error(`No card ${oracleId}`);
      return counts;
    },
  };
}
