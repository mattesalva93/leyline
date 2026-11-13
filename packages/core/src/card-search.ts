import { defaultPrintFor } from './default-print.ts';
import { MIN_SIMILARITY, nameKey } from './name-match.ts';
import type { Candidate, Catalog, Lang } from './types.ts';

export interface CardSearch {
  /** The name as the user is typing it, in English or in a language the catalog holds. */
  readonly query: string;
  /** The language the found cards' default prints are in. */
  readonly lang: Lang;
  /** Today's date (ISO, `YYYY-MM-DD`): prints released later are not default prints. */
  readonly today: string;
  /** How many cards to return at most. */
  readonly limit: number;
}

/**
 * The cards whose name matches `query`, best match first, each with its default print: named
 * exactly so, then named starting so, then named about so, forgiving misspellings as resolving
 * a decklist line does. Cards that can be printed come before those that cannot.
 */
export async function searchCards(
  catalog: Catalog,
  { query, lang, today, limit }: CardSearch,
): Promise<Candidate[]> {
  const key = nameKey(query);
  if (key === '') return [];
  const entries = await catalog.searchByName(key, { minSimilarity: MIN_SIMILARITY, limit });
  const found = entries.map((entry): Candidate => ({
    card: entry.card,
    ...defaultPrintFor(entry.prints, lang, today),
  }));
  return [
    ...found.filter((candidate) => candidate.defaultPrint),
    ...found.filter((candidate) => !candidate.defaultPrint),
  ];
}
