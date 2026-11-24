import {
  linesAskedForTokens,
  tokenCreatorNamesOf,
  tokenQueryLineOf,
  type DecklistLine,
  type Lang,
  type SuggestedToken,
} from '@leyline/core';
import { useEffect, useState } from 'react';
import { fetchSuggestedTokens } from '../api.ts';
import { recentAnswers } from './recent-answers.ts';

interface TokenSuggestions {
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

/** Enough to undo a few changes; a long session never keeps more. */
const KEPT_ANSWER_COUNT = 16;

/**
 * The tokens the cards of `lines` create, less the ones `lines` already hold. Asked of the server
 * only once no line awaits its resolution: a line on its way would change the request twice.
 */
export function useSuggestedTokens(
  lines: readonly DecklistLine[],
  lang: Lang,
  isAnyLineAwaitingResolution: boolean,
): TokenSuggestions {
  const askedLines = linesAskedForTokens(lines);
  const queryLines = askedLines.map((line) => tokenQueryLineOf(line));
  const requestKey = JSON.stringify([lang, queryLines]);
  // Kept for the life of the page, so going back to a decklist already asked for asks nothing.
  const [keptAnswers] = useState(() => recentAnswers<AnsweredSuggestion>(KEPT_ANSWER_COUNT));
  const [answer, setAnswer] = useState<AnsweredSuggestion>(NOTHING_ANSWERED_YET);
  // The lines of the request go with it, for the answer to name the cards it points to.
  const [request, setRequest] = useState({ key: requestKey, lang, queryLines, askedLines });
  if (!isAnyLineAwaitingResolution && request.key !== requestKey) {
    setRequest({ key: requestKey, lang, queryLines, askedLines });
    // An emptied decklist leaves no answer standing for the next one to show while it resolves.
    const knownAnswer =
      askedLines.length === 0 ? NOTHING_ANSWERED_YET : keptAnswers.recall(requestKey);
    if (knownAnswer) setAnswer(knownAnswer);
  }
  useEffect(() => {
    if (request.queryLines.length === 0 || keptAnswers.holds(request.key)) return;
    let isCurrent = true;
    fetchSuggestedTokens(request.queryLines, request.lang).then(
      (tokens) => {
        const answered = { tokens, askedLines: request.askedLines };
        keptAnswers.keep(request.key, answered);
        if (isCurrent) setAnswer(answered);
      },
      // The last answer stands; the request goes again when it next changes.
      () => {},
    );
    return () => {
      isCurrent = false;
    };
  }, [request, keptAnswers]);
  const creatorNamesOfSuggestedToken = (token: SuggestedToken) =>
    tokenCreatorNamesOf(token, answer.askedLines);
  if (queryLines.length === 0 && !isAnyLineAwaitingResolution) {
    return { suggestedTokens: [], creatorNamesOfSuggestedToken };
  }
  const inDecklist = new Set(queryLines.map((queryLine) => queryLine.oracleId));
  const suggestedTokens = answer.tokens.filter(
    (token) => !inDecklist.has(token.candidate.card.oracleId),
  );
  return { suggestedTokens, creatorNamesOfSuggestedToken };
}
