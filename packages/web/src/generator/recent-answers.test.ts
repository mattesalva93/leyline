import { describe, expect, it } from 'vitest';
import { recentAnswers } from './recent-answers.ts';

describe('recentAnswers', () => {
  it('answers a key with the answer kept for it, and nothing for a key never kept', () => {
    const answers = recentAnswers<string>(2);
    answers.keep('a', 'answer to a');

    expect(answers.answerTo('a')).toBe('answer to a');
    expect(answers.answerTo('b')).toBeUndefined();
  });

  it('lets the answer used longest ago go once more than the limit are kept', () => {
    const answers = recentAnswers<string>(2);
    answers.keep('a', 'answer to a');
    answers.keep('b', 'answer to b');
    answers.answerTo('a');

    answers.keep('c', 'answer to c');

    expect(answers.answerTo('b')).toBeUndefined();
    expect(answers.answerTo('a')).toBe('answer to a');
    expect(answers.answerTo('c')).toBe('answer to c');
  });
});
