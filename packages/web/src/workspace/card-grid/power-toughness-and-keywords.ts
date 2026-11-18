import type { Card, Lang } from '@mtg-suite/core';
import italianKeywordNames from '../../locales/keyword-names.it.json';

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
  const keywords = printedKeywordsOf(card)
    .map((keyword) => keywordName(keyword, lang))
    .join(', ');
  return [powerToughness, keywords].filter((part) => part !== '').join(' ');
}

const GENERIC_LANDWALK = 'Landwalk';

/**
 * Scryfall lists `Landwalk` beside each specific landwalk (`Forestwalk`, `Islandwalk`), while
 * the card prints only the specific one.
 */
function printedKeywordsOf(card: Card): readonly string[] {
  const hasSpecificLandwalk = card.keywords.some(
    (keyword) => keyword !== GENERIC_LANDWALK && keyword.endsWith('walk'),
  );
  return hasSpecificLandwalk
    ? card.keywords.filter((keyword) => keyword !== GENERIC_LANDWALK)
    : card.keywords;
}

function keywordName(keyword: string, lang: Lang): string {
  return lang === 'it' ? (italianNames[keyword] ?? keyword) : keyword;
}
