import { defaultPrintFor, defaultPrintPreference } from './default-print.ts';
import { cardKeys } from './name-match.ts';
import type { Candidate, CatalogEntry, Lang } from './types.ts';

/** A candidate with the name keys of its card (see `cardKeys`). */
interface NamedCandidate {
  readonly candidate: Candidate;
  readonly keys: readonly string[];
}

/**
 * `entry`'s card with its default print for a line in `lang` on `today`, ready to compare with
 * the cards sharing a name.
 */
export function namedCandidate(
  entry: CatalogEntry,
  { lang, today }: { readonly lang: Lang; readonly today: string },
): NamedCandidate {
  const keys = cardKeys(
    entry.card.name,
    entry.prints.map((print) => print.printedName),
  );
  return { candidate: { card: entry.card, ...defaultPrintFor(entry.prints, lang, today) }, keys };
}

function shareAName(a: NamedCandidate, b: NamedCandidate): boolean {
  return a.keys.some((key) => b.keys.includes(key));
}

/**
 * The card among `named` that `one` gives way to: of the cards sharing a name with it, the first
 * whose default print is the most preferred, when that beats `one`'s; `null` when none does. Art
 * series, for one, are separate cards named after the card (ADR 0014).
 */
function beaterOf(one: NamedCandidate, named: readonly NamedCandidate[]): NamedCandidate | null {
  const preference = (it: NamedCandidate) => defaultPrintPreference(it.candidate);
  const best = named
    .filter((other) => other !== one && shareAName(one, other))
    .reduce<NamedCandidate | null>(
      (found, other) => (found && preference(found) <= preference(other) ? found : other),
      null,
    );
  return best && preference(best) < preference(one) ? best : null;
}

/** The candidates no card sharing a name with them beats: the ones a line can resolve to. */
export function withoutOutranked(named: readonly NamedCandidate[]): Candidate[] {
  return named.filter((one) => !beaterOf(one, named)).map(({ candidate }) => candidate);
}

/**
 * The candidates in their order, except that a card goes right after the card sharing a name
 * with it that beats it.
 */
export function afterPreferredSameNamed(named: readonly NamedCandidate[]): Candidate[] {
  const placed = named.map((one, index) => {
    const beater = beaterOf(one, named);
    return { one, index, anchor: beater ? named.indexOf(beater) : index, isBeaten: !!beater };
  });
  return placed
    .sort(
      (a, b) => a.anchor - b.anchor || Number(a.isBeaten) - Number(b.isBeaten) || a.index - b.index,
    )
    .map(({ one }) => one.candidate);
}
