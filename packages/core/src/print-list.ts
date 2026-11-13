import { printablePrints } from './default-print.ts';
import { comparePrintSortKeys, printSortKey, type PrintSortKey } from './print-order.ts';
import { LANGS, type Catalog, type Lang, type PrintPage } from './types.ts';

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

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function decodeCursor(cursor: unknown): PrintSortKey | null {
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
  return isKey ? (key as unknown as PrintSortKey) : null;
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
  // Same fallback as the default print: a line with no print in its language prints English.
  const inLang = printablePrints(entry.prints, lang, today);
  const prints = inLang.length > 0 ? inLang : printablePrints(entry.prints, 'en', today);
  const after = cursor ? decodeCursor(cursor) : null;
  if (cursor && !after) throw new Error(`Not a print cursor: ${cursor}`);
  const start = after
    ? prints.findIndex((print) => comparePrintSortKeys(printSortKey(print), after) > 0)
    : 0;
  const page = start === -1 ? [] : prints.slice(start, start + limit);
  const last = page.at(-1);
  const hasMore = start !== -1 && start + limit < prints.length;
  return {
    prints: page,
    total: prints.length,
    nextCursor: hasMore && last ? JSON.stringify(printSortKey(last)) : null,
  };
}

/** How many prints a card can print with in each language. */
export type PrintCountsByLang = Readonly<Record<Lang, number>>;

/**
 * How many printable prints the card `oracleId` has in each language, with no English fallback:
 * a language with none counts zero. `null` when the catalog holds no card `oracleId`.
 */
export async function countPrintsByLang(
  catalog: Catalog,
  { oracleId, today }: { readonly oracleId: string; readonly today: string },
): Promise<PrintCountsByLang | null> {
  const entry = await catalog.findCard(oracleId);
  if (!entry) return null;
  const countIn = (lang: Lang) => printablePrints(entry.prints, lang, today).length;
  return Object.fromEntries(LANGS.map((lang) => [lang, countIn(lang)])) as PrintCountsByLang;
}

/** `lang`, unless the card has no print in it and has some in another language. */
export function langWithPrints(lang: Lang, printCounts: PrintCountsByLang): Lang {
  if (printCounts[lang] > 0) return lang;
  return LANGS.find((other) => printCounts[other] > 0) ?? lang;
}
