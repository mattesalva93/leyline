import { frontFaceKey, MIN_SIMILARITY, nameKey } from './name-match.ts';
import { namedCandidate, withoutOutranked } from './same-name-preference.ts';
import type { Candidate, Catalog, CatalogEntry, FoundCard, Lang } from './types.ts';

/** The language and date the default prints are picked for. */
interface DefaultPrintContext {
  /** The language the cards' default prints are in. */
  readonly lang: Lang;
  /** Today's date (ISO, `YYYY-MM-DD`): prints released later are not default prints. */
  readonly today: string;
}

export interface CardsNamedQuery extends DefaultPrintContext {
  /** The exact name, in English or in a language the catalog holds. */
  readonly name: string;
}

/**
 * Every card a line naming `name` could mean, each with its default print: those named so, and
 * the double-faced cards whose front face is. Cards with no printable print are left out, and so
 * are those another card of the name outranks, as resolving a line does. The order is the same
 * on every call.
 */
export async function listCardsNamed(
  catalog: Catalog,
  { name, ...context }: CardsNamedQuery,
): Promise<Candidate[]> {
  const key = nameKey(name);
  const entries = await catalog.findByNames([key], { minSimilarity: MIN_SIMILARITY });
  return cardsNamedAmong(entries, key, context);
}

/** `found`, each with how many cards `listCardsNamed` lists for the name of its front face. */
export async function withSameNamedCardCounts(
  catalog: Catalog,
  found: readonly Candidate[],
  context: DefaultPrintContext,
): Promise<FoundCard[]> {
  const keyOf = (candidate: Candidate) => frontFaceKey(candidate.card.name);
  const keys = [...new Set(found.map(keyOf))];
  // One catalog call for every name: a search finds several cards.
  const entries = await catalog.findByNames(keys, { minSimilarity: MIN_SIMILARITY });
  const counts = new Map(keys.map((key) => [key, cardsNamedAmong(entries, key, context).length]));
  return found.map((candidate) => ({
    ...candidate,
    sameNamedCardCount: counts.get(keyOf(candidate)) ?? 0,
  }));
}

/** `listCardsNamed` for the cards answering to `sharedKey`, among `entries` already found. */
function cardsNamedAmong(
  entries: readonly CatalogEntry[],
  sharedKey: string,
  context: DefaultPrintContext,
): Candidate[] {
  const named = entries
    .map((entry) => namedCandidate(entry, context))
    .filter(({ candidate, keys }) => candidate.defaultPrint !== null && keys.includes(sharedKey));
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
