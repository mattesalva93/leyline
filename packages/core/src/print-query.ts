// How a print query narrows the prints of a card in the print picker.
import { nameKey } from './name-match.ts';
import type { Print } from './types.ts';

/** The words of `text`, compared without case or accents. */
function wordsOf(text: string): string[] {
  const key = nameKey(text);
  return key === '' ? [] : key.split(' ');
}

/** What a print query word can match on `print`: each field whole, and each word of it. */
function searchableTextsOf(print: Print): string[] {
  const fields = [
    print.set,
    print.setName,
    print.collectorNumber,
    print.releasedAt.slice(0, 4),
    ...print.faces.map((face) => face.artist),
    ...print.promoTypes,
  ].map(nameKey);
  return [...fields, ...fields.flatMap((field) => field.split(' '))];
}

/**
 * The prints that every word of `printQuery` starts a field of, or a word of a field: set, set
 * name, collector number, release year, the artist of a face, a promo type. A query with no
 * words keeps every print.
 */
export function printsMatching(prints: readonly Print[], printQuery: string): readonly Print[] {
  const queryWords = wordsOf(printQuery);
  if (queryWords.length === 0) return prints;
  return prints.filter((print) => {
    const texts = searchableTextsOf(print);
    return queryWords.every((word) => texts.some((text) => text.startsWith(word)));
  });
}
