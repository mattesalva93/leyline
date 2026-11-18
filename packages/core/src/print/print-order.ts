import type { Print } from '../types.ts';

const TOKEN_LAYOUTS = new Set(['token', 'double_faced_token', 'emblem']);

/** Whether a Scryfall `layout` is a token's or an emblem's. */
export function isTokenLayout(layout: string): boolean {
  return TOKEN_LAYOUTS.has(layout);
}

/** The kinds of print less preferred than a regular paper one, most preferred first (ADR 0014). */
const LESS_PREFERRED_KINDS = [
  (print: Print) => print.promoTypes.includes('playtest'),
  (print: Print) => print.oversized,
  (print: Print) => print.layout === 'art_series',
  (print: Print) => isTokenLayout(print.layout) || print.setType === 'token',
  (print: Print) => print.digital,
] as const;

/**
 * How far down the order of preference a print sits: 0 for a regular paper print. A print of
 * several kinds sits with the least preferred of them.
 */
export function printPreference(print: Print): number {
  return LESS_PREFERRED_KINDS.findLastIndex((isOfKind) => isOfKind(print)) + 1;
}

/** Where a print sorts among a card's prints. */
export type PrintSortKey = readonly [
  preference: number,
  releasedAt: string,
  set: string,
  collectorNumber: string,
  id: string,
];

export function printSortKey(print: Print): PrintSortKey {
  return [printPreference(print), print.releasedAt, print.set, print.collectorNumber, print.id];
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Whether `value` has the shape of a `PrintSortKey`, as one read back from a cursor. */
export function isPrintSortKey(value: unknown): value is PrintSortKey {
  if (!Array.isArray(value) || value.length !== 5) return false;
  const [preference, releasedAt, ...rest] = value as unknown[];
  return (
    Number.isInteger(preference) &&
    typeof releasedAt === 'string' &&
    ISO_DATE.test(releasedAt) &&
    rest.every((part) => typeof part === 'string')
  );
}

/**
 * Most preferred kind first, then newest first; within a release day by set, then collector
 * number ("9" before "10").
 */
export function comparePrintSortKeys(a: PrintSortKey, b: PrintSortKey): number {
  return (
    a[0] - b[0] ||
    b[1].localeCompare(a[1]) ||
    a[2].localeCompare(b[2]) ||
    a[3].localeCompare(b[3], 'en', { numeric: true }) ||
    a[4].localeCompare(b[4])
  );
}
