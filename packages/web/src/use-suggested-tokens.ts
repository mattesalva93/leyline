import { lineCardOf, type DecklistLine, type Lang, type SuggestedToken } from '@mtg-suite/core';
import { useEffect, useState } from 'react';
import { fetchSuggestedTokens } from './api.ts';

/**
 * The tokens the cards of `lines` create, asked of the server again whenever the cards or the
 * prints they show change. Until it answers, the last answer stands, less the tokens `lines`
 * now hold; a failed request keeps it too. No line, no token.
 */
export function useSuggestedTokens(
  lines: readonly DecklistLine[],
  lang: Lang,
): readonly SuggestedToken[] {
  const lineCards = lines.flatMap((line) => lineCardOf(line) ?? []);
  const requestKey = JSON.stringify([lang, lineCards]);
  const [suggested, setSuggested] = useState<readonly SuggestedToken[]>([]);
  useEffect(() => {
    const [requestLang, requestLines] = JSON.parse(requestKey) as [Lang, typeof lineCards];
    if (requestLines.length === 0) return;
    let isCurrent = true;
    fetchSuggestedTokens(requestLines, requestLang).then(
      (tokens) => {
        if (isCurrent) setSuggested(tokens);
      },
      () => {},
    );
    return () => {
      isCurrent = false;
    };
  }, [requestKey]);
  if (lineCards.length === 0) return [];
  const inDecklist = new Set(lineCards.map((lineCard) => lineCard.oracleId));
  return suggested.filter((token) => !inDecklist.has(token.candidate.card.oracleId));
}
