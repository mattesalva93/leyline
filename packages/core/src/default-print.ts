import { comparePrintSortKeys, printSortKey } from './print-order.ts';
import type { Candidate, Lang, Print, PrintWarning } from './types.ts';

const TOKEN_LAYOUTS = new Set(['token', 'double_faced_token', 'emblem']);

/** Whether Scryfall has a scan of the print, not a stand-in picture or nothing at all. */
export function hasRealImage(print: Print): boolean {
  return print.imageStatus !== 'placeholder' && print.imageStatus !== 'missing';
}

/** Whether a print can stand in for a playable paper card. */
function isPrintable(print: Print): boolean {
  return (
    !print.digital &&
    !print.oversized &&
    print.layout !== 'art_series' &&
    !TOKEN_LAYOUTS.has(print.layout) &&
    print.setType !== 'token' &&
    !print.promoTypes.includes('playtest') &&
    hasRealImage(print)
  );
}

/**
 * The printable paper prints in `lang` already released on `today` (ISO date), newest first.
 * Scryfall lists previewed prints before their release date.
 */
export function printablePrints(prints: readonly Print[], lang: Lang, today: string): Print[] {
  return prints
    .filter((print) => print.lang === lang && isPrintable(print) && print.releasedAt <= today)
    .sort((a, b) => comparePrintSortKeys(printSortKey(a), printSortKey(b)));
}

/** The first of `printablePrints`, or `null` when there is none. */
function latestPrintable(prints: readonly Print[], lang: Lang, today: string): Print | null {
  return printablePrints(prints, lang, today)[0] ?? null;
}

/**
 * What to warn about a print used by a line in its own language. `englishExists` tells whether
 * the line, switched to English, would get an English print with a real image instead.
 */
export function qualityWarning(print: Print | null, englishExists: boolean): PrintWarning | null {
  // English is what a line falls back to, so only other languages can trade it for quality.
  if (!print || print.lang === 'en' || print.imageStatus !== 'lowres') return null;
  return englishExists ? 'lowResolution' : 'lowResolutionWithoutEnglish';
}

/** Most serious first: printing another language than asked beats a blurry image. */
const WARNINGS_BY_SEVERITY: readonly PrintWarning[] = [
  'languageFallback',
  'lowResolutionWithoutEnglish',
  'lowResolution',
];

/** The most serious of `warnings`, or `null` when there is none. */
export function mostSeriousWarning(
  warnings: readonly (PrintWarning | null)[],
): PrintWarning | null {
  return WARNINGS_BY_SEVERITY.find((warning) => warnings.includes(warning)) ?? null;
}

/**
 * The default print of a card's `prints` for a line in `lang`, with what to warn about. A line
 * whose language has no printable print falls back to English.
 */
export function defaultPrintFor(
  prints: readonly Print[],
  lang: Lang,
  today: string,
): Pick<Candidate, 'defaultPrint' | 'printWarning'> {
  const print = latestPrintable(prints, lang, today);
  const english = lang === 'en' ? print : latestPrintable(prints, 'en', today);
  if (!print && lang !== 'en') {
    return { defaultPrint: english, printWarning: english && 'languageFallback' };
  }
  return { defaultPrint: print, printWarning: qualityWarning(print, english !== null) };
}
