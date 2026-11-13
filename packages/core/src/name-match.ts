// How a written name is compared with card names. `api` builds its search index with
// `cardKeys`, so the catalog and `core` agree on what a name looks like.

/** Least trigram similarity for a misspelled name to match a card: pg_trgm's default. */
export const MIN_SIMILARITY = 0.3;

/** Lookup key for a name: case, spacing and accents do not matter. */
export function nameKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[‘’]/g, "'")
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

const FACE_SEPARATOR = ' // ';

/** Keys a line may use for a name: the full name, and its front face for multi-face names. */
function nameKeys(name: string): string[] {
  const [frontFace] = name.split(FACE_SEPARATOR);
  const keys = [nameKey(name)];
  if (frontFace !== undefined && frontFace !== name) keys.push(nameKey(frontFace));
  return keys;
}

/** Keys a card answers to: those of its English name and of every name printed on its prints. */
export function cardKeys(cardName: string, printedNames: readonly string[]): string[] {
  return [...new Set([cardName, ...printedNames].flatMap(nameKeys))];
}

/** pg_trgm's trigrams: each alphanumeric word padded with two spaces before and one after. */
export function trigrams(key: string): Set<string> {
  const result = new Set<string>();
  for (const word of key.match(/[\p{L}\p{N}]+/gu) ?? []) {
    const padded = `  ${word} `;
    for (let i = 0; i + 3 <= padded.length; i++) result.add(padded.slice(i, i + 3));
  }
  return result;
}

/** pg_trgm's `similarity()` on two `trigrams` sets: shared over all distinct, from 0 to 1. */
export function trigramSimilarity(left: ReadonlySet<string>, right: ReadonlySet<string>): number {
  let shared = 0;
  for (const trigram of left) if (right.has(trigram)) shared++;
  const total = left.size + right.size - shared;
  return total === 0 ? 0 : shared / total;
}
