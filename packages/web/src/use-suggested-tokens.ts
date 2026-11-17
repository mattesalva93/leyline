import {
  tokenQueryLineOf,
  type DecklistLine,
  type Lang,
  type SuggestedToken,
} from '@mtg-suite/core';
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
  const queryLines = lines.flatMap((line) => tokenQueryLineOf(line) ?? []);
  const requestKey = JSON.stringify([lang, queryLines]);
  const [suggested, setSuggested] = useState<readonly SuggestedToken[]>([]);
  useEffect(() => {
    const [requestLang, requestLines] = JSON.parse(requestKey) as [Lang, typeof queryLines];
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
  if (queryLines.length === 0) return [];
  const inDecklist = new Set(queryLines.map((queryLine) => queryLine.oracleId));
  return suggested.filter((token) => !inDecklist.has(token.candidate.card.oracleId));
}
