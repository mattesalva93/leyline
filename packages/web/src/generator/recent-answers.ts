/** The answers kept by the key of their request, the most recently used ones only. */
export interface RecentAnswers<Answer> {
  /** The answer kept for `key`, now the most recently used one; `undefined` if none is kept. */
  readonly answerTo: (key: string) => Answer | undefined;
  /** Keeps `answer` for `key`, letting the answer used longest ago go past `limit`. */
  readonly keep: (key: string, answer: Answer) => void;
}

export function recentAnswers<Answer>(limit: number): RecentAnswers<Answer> {
  // A `Map` iterates in insertion order: inserting an answer again makes it the newest.
  const byKey = new Map<string, Answer>();
  function markUsed(key: string, answer: Answer) {
    byKey.delete(key);
    byKey.set(key, answer);
  }
  return {
    answerTo(key) {
      const answer = byKey.get(key);
      if (answer !== undefined) markUsed(key, answer);
      return answer;
    },
    keep(key, answer) {
      markUsed(key, answer);
      for (const oldestKey of byKey.keys()) {
        if (byKey.size <= limit) break;
        byKey.delete(oldestKey);
      }
    },
  };
}
