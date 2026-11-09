import type { Lang, Print } from './types.ts';

const TOKEN_LAYOUTS = new Set(['token', 'double_faced_token', 'emblem']);

/** Whether a print can stand in for a playable paper card. */
function isPrintable(print: Print): boolean {
  return (
    !print.digital &&
    !print.oversized &&
    print.layout !== 'art_series' &&
    !TOKEN_LAYOUTS.has(print.layout) &&
    print.setType !== 'token' &&
    !print.promoTypes.includes('playtest') &&
    print.imageStatus !== 'placeholder' &&
    print.imageStatus !== 'missing'
  );
}

/**
 * The most recent printable paper print in `lang` already released on `today` (ISO date), or
 * `null` when there is none. Scryfall lists previewed prints before their release date.
 */
export function defaultPrint(prints: readonly Print[], lang: Lang, today: string): Print | null {
  let best: Print | null = null;
  for (const print of prints) {
    const eligible = print.lang === lang && isPrintable(print) && print.releasedAt <= today;
    if (eligible && (!best || print.releasedAt > best.releasedAt)) best = print;
  }
  return best;
}
