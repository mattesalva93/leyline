import type { Card, Lang } from '@mtg-suite/core';
import italian from './locales/it.json';

const italianKeywords: Readonly<Record<string, string>> = italian.keywords;

/** The power and toughness, then the keywords, of `card`, as a token choice tells cards apart. */
export function characteristicsLineOf(card: Card, lang: Lang): string {
  const powerToughness = card.powerToughnessByFace
    .filter((face) => face !== null)
    .map((face) => `${face.power}/${face.toughness}`)
    .join(' // ');
  const keywords = card.keywords.map((keyword) => keywordName(keyword, lang)).join(', ');
  return [powerToughness, keywords].filter((part) => part !== '').join(' ');
}

function keywordName(keyword: string, lang: Lang): string {
  return lang === 'it' ? (italianKeywords[keyword] ?? keyword) : keyword;
}
