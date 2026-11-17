import {
  tokenCreatorsOf,
  tokenQueryLineOf,
  type Card,
  type DecklistLine,
  type Lang,
  type SuggestedToken,
} from '@mtg-suite/core';
import { useEffect, useState } from 'react';
import { fetchSuggestedTokens } from './api.ts';

export interface TokenSuggestions {
  readonly suggestedTokens: readonly SuggestedToken[];
  /** The cards creating one of `suggestedTokens`, first creator first. */
  readonly creatorsOf: (token: SuggestedToken) => readonly Card[];
}

/** An answer of the server, with the lines it was asked for: its `createdBy` point among them. */
interface Answer {
  readonly tokens: readonly SuggestedToken[];
  readonly lines: readonly DecklistLine[];
}

const NO_ANSWER: Answer = { tokens: [], lines: [] };

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
  const [answer, setAnswer] = useState<Answer>(NO_ANSWER);
  useEffect(() => {
    const [requestLang, requestLines] = JSON.parse(request.key) as [Lang, typeof queryLines];
    if (requestLines.length === 0) return;
    let isCurrent = true;
    fetchSuggestedTokens(requestLines, requestLang).then(
      (tokens) => {
        if (isCurrent) setAnswer({ tokens, lines: request.lines });
      },
      () => {},
    );
    return () => {
      isCurrent = false;
    };
  }, [request]);
  const creatorsOf = (token: SuggestedToken) => tokenCreatorsOf(token, answer.lines);
  if (queryLines.length === 0) return { suggestedTokens: [], creatorsOf };
  const inDecklist = new Set(queryLines.map((queryLine) => queryLine.oracleId));
  const suggestedTokens = answer.tokens.filter(
    (token) => !inDecklist.has(token.candidate.card.oracleId),
  );
  return { suggestedTokens, creatorsOf };
}
