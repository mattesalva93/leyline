import { defaultPrintFor } from './default-print.ts';
import { MIN_SIMILARITY, nameKey } from './name-match.ts';
import { namedCandidate, withoutOutranked } from './same-name-preference.ts';
import type { Candidate, Catalog, CatalogEntry, Lang } from './types.ts';

export interface CardsNamed {
  /** The exact name, in English or in a language the catalog holds. */
  readonly name: string;
  /** The language the cards' default prints are in. */
  readonly lang: Lang;
  /** Today's date (ISO, `YYYY-MM-DD`): prints released later are not default prints. */
  readonly today: string;
}

/**
 * Every card a line naming `name` could mean, each with its default print: those named so, and
 * the double-faced cards whose front face is. Cards with no printable print are left out, and so
 * are those another card of the name outranks, as resolving a line does. The order is the same
 * on every call.
 */
export async function listCardsNamed(
  catalog: Catalog,
  { name, lang, today }: CardsNamed,
): Promise<Candidate[]> {
  const key = nameKey(name);
  const entries = await catalog.findByNames([key], { minSimilarity: MIN_SIMILARITY });
  return cardsNamedAmong(entries, key, { lang, today });
}

/** `listCardsNamed` for the name key `key`, among `entries` already found. */
export function cardsNamedAmong(
  entries: readonly CatalogEntry[],
  key: string,
  { lang, today }: Pick<CardsNamed, 'lang' | 'today'>,
): Candidate[] {
  const named = entries
    .map((entry) =>
      namedCandidate(entry, { card: entry.card, ...defaultPrintFor(entry.prints, lang, today) }),
    )
    .filter(({ candidate, keys }) => candidate.defaultPrint !== null && keys.includes(key));
  return withoutOutranked(named).sort(byNameThenNewestDefaultPrint);
}

/** Code-unit order, not the locale's: the same on every server. */
function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function byNameThenNewestDefaultPrint(a: Candidate, b: Candidate): number {
  return (
    compareText(a.card.name, b.card.name) ||
    compareText(b.defaultPrint?.releasedAt ?? '', a.defaultPrint?.releasedAt ?? '') ||
    compareText(a.card.oracleId, b.card.oracleId)
  );
}
