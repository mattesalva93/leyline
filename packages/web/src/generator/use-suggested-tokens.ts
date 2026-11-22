import {
  linesAskedForTokens,
  tokenCreatorNamesOf,
  tokenQueryLineOf,
  type DecklistLine,
  type Lang,
  type SuggestedToken,
} from '@mtg-suite/core';
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
 * The tokens the cards of `lines` create, asked of the server again whenever the cards or the
 * prints they show change, once no line of the decklist awaits its resolution any more: a line
 * on its way would change the request twice. Until the server answers, the last answer stands,
 * less the tokens `lines` now hold; a failed request keeps it too, and is asked again next time.
 * An answer already received for the same request is used again, with no request. No line,
 * none awaited, no token.
 */
export function useSuggestedTokens(
  lines: readonly DecklistLine[],
  lang: Lang,
  isAnyLineAwaitingResolution: boolean,
): TokenSuggestions {
  const askedLines = linesAskedForTokens(lines);
  const queryLines = askedLines.flatMap((line) => tokenQueryLineOf(line) ?? []);
  const requestKey = JSON.stringify([lang, queryLines]);
  // Kept for the life of the page, so going back to a decklist already asked for asks nothing.
  const [keptAnswers] = useState(() => recentAnswers<AnsweredSuggestion>(KEPT_ANSWER_COUNT));
  const [answer, setAnswer] = useState<AnsweredSuggestion>(NOTHING_ANSWERED_YET);
  // The lines of the request go with it, for the answer to name the cards it points to.
  const [request, setRequest] = useState({ key: requestKey, lines: askedLines });
  if (!isAnyLineAwaitingResolution && request.key !== requestKey) {
    setRequest({ key: requestKey, lines: askedLines });
    // An emptied decklist leaves no answer standing for the next one to show while it resolves.
    const knownAnswer =
      askedLines.length === 0 ? NOTHING_ANSWERED_YET : keptAnswers.answerTo(requestKey);
    if (knownAnswer) setAnswer(knownAnswer);
  }
  useEffect(() => {
    const [requestLang, requestLines] = JSON.parse(request.key) as [Lang, typeof queryLines];
    if (requestLines.length === 0 || keptAnswers.answerTo(request.key)) return;
    let isCurrent = true;
    fetchSuggestedTokens(requestLines, requestLang).then(
      (tokens) => {
        const answered = { tokens, askedLines: request.lines };
        keptAnswers.keep(request.key, answered);
        if (isCurrent) setAnswer(answered);
      },
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
