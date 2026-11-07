import type { Print } from './types.ts';

const TOKEN_LAYOUTS = new Set(['token', 'double_faced_token', 'emblem']);

/** Whether a print can stand in for a playable paper card (see `defaultPrint` in GLOSSARY.md). */
function isPrintable(print: Print): boolean {
  return (
    !print.digital &&
    !print.oversized &&
    print.layout !== 'art_series' &&
    !TOKEN_LAYOUTS.has(print.layout) &&
    print.setType !== 'token' &&
    print.setType !== 'playtest' &&
    print.imageStatus !== 'placeholder' &&
    print.imageStatus !== 'missing'
  );
}

/** The most recent printable paper print, or `null` when there is none. */
export function defaultPrint(prints: readonly Print[]): Print | null {
  let best: Print | null = null;
  for (const print of prints) {
    if (isPrintable(print) && (!best || print.releasedAt > best.releasedAt)) best = print;
  }
  return best;
}
