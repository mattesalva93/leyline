import type { Catalog, CatalogEntry } from './types.ts';

/** A `Catalog` over a fixed list of entries, for tests. */
export function createInMemoryCatalog(entries: readonly CatalogEntry[]): Catalog {
  return {
    findByNames: async () => entries,
    findCard: async (oracleId) => entries.find((entry) => entry.card.oracleId === oracleId) ?? null,
  };
}
