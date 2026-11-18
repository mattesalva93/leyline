import type { Card, Lang } from '@mtg-suite/core';
import italianKeywordNames from './locales/keyword-names.it.json';

const italianNames: Readonly<Record<string, string>> = italianKeywordNames;

/**
 * The power and toughness, then the keywords, of `card`, in the card language `lang`: what tells
 * apart tokens that share a name.
 */
export function powerToughnessAndKeywordsOf(card: Card, lang: Lang): string {
  const powerToughness = card.powerToughnessByFace
    .filter((face) => face !== null)
    .map((face) => `${face.power}/${face.toughness}`)
    .join(' // ');
  const keywords = card.keywords.map((keyword) => keywordName(keyword, lang)).join(', ');
  return [powerToughness, keywords].filter((part) => part !== '').join(' ');
}

function keywordName(keyword: string, lang: Lang): string {
  return lang === 'it' ? (italianNames[keyword] ?? keyword) : keyword;
}
