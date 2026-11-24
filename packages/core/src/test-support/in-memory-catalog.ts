import { cardKeys, trigramSimilarity, trigrams } from '../name-match.ts';
import type { Catalog, CatalogEntry, TokenLink } from '../types.ts';

/** How a card's name keys answer a name search: lower `group` first, then higher `similarity`. */
interface SearchMatch {
  readonly entry: CatalogEntry;
  /** 0 for a name key equal to the searched one, 1 for one starting with it, 2 for a similar one. */
  readonly group: number;
  readonly similarity: number;
}

function searchMatch(entry: CatalogEntry, key: string, minSimilarity: number): SearchMatch | null {
  const keys = cardKeys(entry.card.name, entry.prints);
  const keyTrigrams = trigrams(key);
  const similarity = Math.max(...keys.map((k) => trigramSimilarity(trigrams(k), keyTrigrams)));
  if (keys.includes(key)) return { entry, group: 0, similarity };
  if (keys.some((k) => k.startsWith(key))) return { entry, group: 1, similarity };
  return similarity >= minSimilarity ? { entry, group: 2, similarity } : null;
}

/** A `Catalog` over a fixed list of entries and the tokens their prints create, for tests. */
export function createInMemoryCatalog(
  entries: readonly CatalogEntry[],
  tokenLinks: readonly TokenLink[] = [],
): Catalog {
  const entryOfPrint = (printId: string) =>
    entries.find((entry) => entry.prints.some((print) => print.id === printId));
  /** The English print with the set and number of `printId`, which holds its parts. */
  const partsPrintId = (printId: string) => {
    const prints = entryOfPrint(printId)?.prints ?? [];
    const asked = prints.find((print) => print.id === printId);
    const english = prints.find(
      (print) =>
        print.lang === 'en' &&
        print.set === asked?.set &&
        print.collectorNumber === asked.collectorNumber,
    );
    return english?.id ?? printId;
  };
  return {
    findByNames: async () => entries,
    searchByName: async (key, { minSimilarity, limit }) =>
      entries
        .flatMap((entry) => searchMatch(entry, key, minSimilarity) ?? [])
        .sort(
          (a, b) =>
            a.group - b.group ||
            b.similarity - a.similarity ||
            a.entry.card.name.localeCompare(b.entry.card.name),
        )
        .slice(0, limit)
        .map((match) => match.entry),
    findCard: async (oracleId) => entries.find((entry) => entry.card.oracleId === oracleId) ?? null,
    findTokensCreatedBy: async (printIds) =>
      printIds.flatMap((creatorPrintId) =>
        tokenLinks.flatMap((link) => {
          const token =
            link.creatorPrintId === partsPrintId(creatorPrintId) && entryOfPrint(link.tokenPrintId);
          return token ? [{ creatorPrintId, tokenPrintId: link.tokenPrintId, token }] : [];
        }),
      ),
  };
}
