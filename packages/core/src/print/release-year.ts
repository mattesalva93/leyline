import type { Print } from '../types.ts';

/** The year `print` came out, as four digits: what the print picker groups prints by. */
export function releaseYearOf(print: Print): string {
  return print.releasedAt.slice(0, 4);
}
