// How a print query narrows the prints of a card in the print picker.
import { nameKey } from './name-match.ts';
import type { Print } from './types.ts';

/** Letters of artist names that stripping accents leaves as they are, as a user types them. */
const PLAIN_LETTERS: Readonly<Record<string, string>> = {
  ł: 'l',
  ø: 'o',
  đ: 'd',
  ð: 'd',
  ı: 'i',
  æ: 'ae',
  œ: 'oe',
  ß: 'ss',
  þ: 'th',
};

const NOT_LETTER_OR_DIGIT = /[^\p{L}\p{N}]+/gu;

/**
 * The words of `text`, split on spaces, with no case, accents or symbols: "O'Connor" and
 * "A.K." read as "oconnor" and "ak", so they match typed with their symbols or without.
 */
function wordsOf(text: string): string[] {
  return [...nameKey(text)]
    .map((letter) => PLAIN_LETTERS[letter] ?? letter)
    .join('')
    .split(' ')
    .map((word) => word.replace(NOT_LETTER_OR_DIGIT, ''))
    .filter((word) => word !== '');
}

/**
 * What a print query word can match the start of on `print`: each field whole, each word of it
 * and each part of a word the symbols split, as "sebastien" in "Jean-Sébastien".
 */
function searchableTextsOf(print: Print): string[] {
  const fields = [
    print.set,
    print.setName,
    print.collectorNumber,
    print.releasedAt.slice(0, 4),
    ...print.faces.map((face) => face.artist),
    ...print.promoTypes,
  ];
  return fields.flatMap((field) => {
    const words = wordsOf(field);
    const parts = wordsOf(field.replace(NOT_LETTER_OR_DIGIT, ' '));
    return [words.join(''), ...words, ...parts];
  });
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
