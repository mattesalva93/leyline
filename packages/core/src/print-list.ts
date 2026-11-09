import { isPrintable } from './default-print.ts';
import type { Catalog, Lang, Print, PrintPage } from './types.ts';

export interface ListPrintsOptions {
  readonly oracleId: string;
  readonly lang: Lang;
  /** Today's date (ISO, `YYYY-MM-DD`): prints released later are not out yet. */
  readonly today: string;
  /** How many prints the page holds at most. */
  readonly limit: number;
  /** The `nextCursor` of the previous page; absent for the first one. */
  readonly cursor?: string | null | undefined;
}

/** Where a print sorts in the list: what a cursor remembers of the last print shown. */
type SortKey = readonly [releasedAt: string, set: string, collectorNumber: string, id: string];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function sortKey(print: Print): SortKey {
  return [print.releasedAt, print.set, print.collectorNumber, print.id];
}

/** Newest first; within a release day by set, then collector number ("9" before "10"). */
function compareSortKeys(a: SortKey, b: SortKey): number {
  return (
    b[0].localeCompare(a[0]) ||
    a[1].localeCompare(b[1]) ||
    a[2].localeCompare(b[2], 'en', { numeric: true }) ||
    a[3].localeCompare(b[3])
  );
}

function decodeCursor(cursor: unknown): SortKey | null {
  if (typeof cursor !== 'string') return null;
  let key: unknown;
  try {
    key = JSON.parse(cursor);
  } catch {
    return null;
  }
  const isKey =
    Array.isArray(key) &&
    key.length === 4 &&
    key.every((part) => typeof part === 'string') &&
    ISO_DATE.test(key[0] as string);
  return isKey ? (key as unknown as SortKey) : null;
}

/** Whether `value` is a cursor `listPrints` handed out. */
export function isPrintCursor(value: unknown): value is string {
  return decodeCursor(value) !== null;
}

/**
 * The prints a line of the card can print with, in `lang`, newest first, one page at a time;
 * or in English when none is printable in `lang`; `null` when the catalog holds no card
 * `oracleId`. A page resumes right after the print the
 * cursor names, so it neither repeats nor skips prints when the catalog changes in between.
 */
export async function listPrints(
  catalog: Catalog,
  { oracleId, lang, today, limit, cursor }: ListPrintsOptions,
): Promise<PrintPage | null> {
  const entry = await catalog.findCard(oracleId);
  if (!entry) return null;
  const printableIn = (printLang: Lang) =>
    entry.prints.filter(
      (print) => print.lang === printLang && isPrintable(print) && print.releasedAt <= today,
    );
  // Same fallback as the default print: a line with no print in its language prints English.
  const inLang = printableIn(lang);
  const prints = (inLang.length > 0 ? inLang : printableIn('en')).sort((a, b) =>
    compareSortKeys(sortKey(a), sortKey(b)),
  );
  const after = cursor ? decodeCursor(cursor) : null;
  if (cursor && !after) throw new Error(`Not a print cursor: ${cursor}`);
  const start = after ? prints.findIndex((print) => compareSortKeys(sortKey(print), after) > 0) : 0;
  const page = start === -1 ? [] : prints.slice(start, start + limit);
  const last = page.at(-1);
  const hasMore = start !== -1 && start + limit < prints.length;
  return {
    prints: page,
    total: prints.length,
    nextCursor: hasMore && last ? JSON.stringify(sortKey(last)) : null,
  };
}
