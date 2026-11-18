import { frontFaceKey, frontFaceName } from '../name-match.ts';
import type { Candidate, FoundCard } from '../types.ts';

/** A row of the add-card search: a card it adds, or a name several cards share. */
export type SearchRow =
  | { readonly kind: 'card'; readonly candidate: Candidate }
  | {
      readonly kind: 'sharedName';
      /** The shared name, as the front face of the first card found with it. */
      readonly name: string;
      /** How many cards share the name: `listCardsNamed` lists them all. */
      readonly cardCount: number;
      /** The first card the search found with the name: the row shows its image. */
      readonly first: Candidate;
    };

/**
 * The rows the search shows for `found`, in the order it found them: a name several cards share
 * is one row, however many of them the search found, since it stops before listing them all.
 */
export function searchRowsOf(found: readonly FoundCard[]): SearchRow[] {
  const rows: SearchRow[] = [];
  const sharedNamesShown = new Set<string>();
  for (const candidate of found) {
    if (candidate.sameNamedCardCount <= 1) {
      rows.push({ kind: 'card', candidate });
      continue;
    }
    const key = frontFaceKey(candidate.card.name);
    if (sharedNamesShown.has(key)) continue;
    sharedNamesShown.add(key);
    rows.push({
      kind: 'sharedName',
      name: frontFaceName(candidate.card.name),
      cardCount: candidate.sameNamedCardCount,
      first: candidate,
    });
  }
  return rows;
}

/**
 * The front-face name every one of `candidates` shares, such as the tokens an ambiguous line
 * written `1 Soldier` could mean; `null` when they are named differently.
 */
export function nameSharedByEvery(candidates: readonly Candidate[]): string | null {
  const [first, ...others] = candidates;
  if (!first) return null;
  const key = frontFaceKey(first.card.name);
  return others.every(({ card }) => frontFaceKey(card.name) === key)
    ? frontFaceName(first.card.name)
    : null;
}
