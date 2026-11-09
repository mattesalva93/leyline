import type { Print } from './types.ts';

/** Where a print sorts among a card's prints. */
export type PrintSortKey = readonly [
  releasedAt: string,
  set: string,
  collectorNumber: string,
  id: string,
];

export function printSortKey(print: Print): PrintSortKey {
  return [print.releasedAt, print.set, print.collectorNumber, print.id];
}

/** Newest first; within a release day by set, then collector number ("9" before "10"). */
export function comparePrintSortKeys(a: PrintSortKey, b: PrintSortKey): number {
  return (
    b[0].localeCompare(a[0]) ||
    a[1].localeCompare(b[1]) ||
    a[2].localeCompare(b[2], 'en', { numeric: true }) ||
    a[3].localeCompare(b[3])
  );
}
