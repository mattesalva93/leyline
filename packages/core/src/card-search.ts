import { defaultPrintFor } from './default-print.ts';
import { frontFaceName, MIN_SIMILARITY, nameKey } from './name-match.ts';
import { cardsNamedAmong } from './same-named-cards.ts';
import { afterPreferredSameNamed, namedCandidate } from './same-name-preference.ts';
import type { Candidate, Catalog, FoundCard, Lang } from './types.ts';

/** How many cards a name search returns: few enough to show each with its image. */
export const CARD_SEARCH_LIMIT = 8;

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
 * a decklist line does. A card sharing a name with another whose default print is more preferred
 * comes right after it: a card before the art series card named after it. Each card tells how
 * many cards share the name of its front face.
 */
export async function searchCards(
  catalog: Catalog,
  { query, lang, today, limit }: CardSearch,
): Promise<FoundCard[]> {
  const key = nameKey(query);
  if (key === '') return [];
  const entries = await catalog.searchByName(key, { minSimilarity: MIN_SIMILARITY, limit });
  const found = afterPreferredSameNamed(
    entries.map((entry) =>
      namedCandidate(entry, { card: entry.card, ...defaultPrintFor(entry.prints, lang, today) }),
    ),
  );
  const sharedNameKey = (candidate: Candidate) => nameKey(frontFaceName(candidate.card.name));
  const sharedNameKeys = [...new Set(found.map(sharedNameKey))];
  // One catalog call for every name: a search finds up to `limit` cards.
  const sameNamed = await catalog.findByNames(sharedNameKeys, { minSimilarity: MIN_SIMILARITY });
  const counts = new Map(
    sharedNameKeys.map((shared) => [
      shared,
      cardsNamedAmong(sameNamed, shared, { lang, today }).length,
    ]),
  );
  return found.map((candidate) => ({
    ...candidate,
    sameNamedCardCount: counts.get(sharedNameKey(candidate)) ?? 0,
  }));
}
