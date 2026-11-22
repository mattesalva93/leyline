import { describe, expect, it } from 'vitest';
import { recentAnswers } from './recent-answers.ts';

describe('recentAnswers', () => {
  it('answers a key with the answer kept for it, and nothing for a key never kept', () => {
    const answers = recentAnswers<string>(2);
    answers.keep('a', 'answer to a');

    expect(answers.recall('a')).toBe('answer to a');
    expect(answers.recall('b')).toBeUndefined();
  });

  it('tells whether an answer is kept without making it the most recently used', () => {
    const answers = recentAnswers<string>(2);
    answers.keep('a', 'answer to a');
    answers.keep('b', 'answer to b');

    expect(answers.holds('a')).toBe(true);
    answers.keep('c', 'answer to c');

    expect(answers.holds('a')).toBe(false);
    expect(answers.holds('b')).toBe(true);
  });

  it('lets the answer used longest ago go once more than the limit are kept', () => {
    const answers = recentAnswers<string>(2);
    answers.keep('a', 'answer to a');
    answers.keep('b', 'answer to b');
    answers.recall('a');

    answers.keep('c', 'answer to c');

    expect(answers.recall('b')).toBeUndefined();
    expect(answers.recall('a')).toBe('answer to a');
    expect(answers.recall('c')).toBe('answer to c');
  });
});
