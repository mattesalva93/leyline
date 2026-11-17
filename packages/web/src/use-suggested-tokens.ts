import {
  tokenCreatorNamesOf,
  tokenQueryLineOf,
  type DecklistLine,
  type Lang,
  type SuggestedToken,
} from '@mtg-suite/core';
import { useEffect, useState } from 'react';
import { fetchSuggestedTokens } from './api.ts';

export interface TokenSuggestions {
  readonly suggestedTokens: readonly SuggestedToken[];
  /** The names of the cards creating one of `suggestedTokens`, as their lines show them. */
  readonly creatorNamesOfSuggestedToken: (token: SuggestedToken) => readonly string[];
}

/** The tokens the server suggested, with the lines asked: their `createdBy` point among these. */
interface AnsweredSuggestion {
  readonly tokens: readonly SuggestedToken[];
  readonly askedLines: readonly DecklistLine[];
}

const NOTHING_ANSWERED_YET: AnsweredSuggestion = { tokens: [], askedLines: [] };

/**
 * The tokens the cards of `lines` create, asked of the server again whenever the cards or the
 * prints they show change. Until it answers, the last answer stands, less the tokens `lines`
 * now hold; a failed request keeps it too. No line, no token.
 */
export function useSuggestedTokens(lines: readonly DecklistLine[], lang: Lang): TokenSuggestions {
  const queryLines = lines.flatMap((line) => tokenQueryLineOf(line) ?? []);
  const requestKey = JSON.stringify([lang, queryLines]);
  // The lines of the request go with it, for the answer to name the cards it points to.
  const [request, setRequest] = useState({ key: requestKey, lines });
  if (request.key !== requestKey) setRequest({ key: requestKey, lines });
  const [answer, setAnswer] = useState<AnsweredSuggestion>(NOTHING_ANSWERED_YET);
  useEffect(() => {
    const [requestLang, requestLines] = JSON.parse(request.key) as [Lang, typeof queryLines];
    if (requestLines.length === 0) return;
    let isCurrent = true;
    fetchSuggestedTokens(requestLines, requestLang).then(
      (tokens) => {
        if (isCurrent) setAnswer({ tokens, askedLines: request.lines });
      },
      () => {},
    );
    return () => {
      isCurrent = false;
    };
  }, [request]);
  const creatorNamesOfSuggestedToken = (token: SuggestedToken) =>
    tokenCreatorNamesOf(token, answer.askedLines);
  if (queryLines.length === 0) return { suggestedTokens: [], creatorNamesOfSuggestedToken };
  const inDecklist = new Set(queryLines.map((queryLine) => queryLine.oracleId));
  const suggestedTokens = answer.tokens.filter(
    (token) => !inDecklist.has(token.candidate.card.oracleId),
  );
  return { suggestedTokens, creatorNamesOfSuggestedToken };
}
