import { describe, expect, it } from 'vitest';
import { closedIssueNumbers } from './close-spec-issues.js';

describe('the issues a pull request body closes, as GitHub reads them on main', () => {
  it('reads every closing keyword, in any case, with or without a colon', () => {
    expect(
      closedIssueNumbers(
        'Closes #216\nfixes #3, Resolved: #40\nclose #5 fixed #6 resolve #7 resolves #8 closed #9 fix #10',
      ),
    ).toEqual([216, 3, 40, 5, 6, 7, 8, 9, 10]);
  });

  it('needs a keyword before each issue, as GitHub does', () => {
    expect(closedIssueNumbers('Closes #1, #2 and #3')).toEqual([1]);
  });

  it('ignores an issue only mentioned, or a keyword inside another word', () => {
    expect(closedIssueNumbers('Parent #214, see #220. Disclose #12, prefixes #13')).toEqual([]);
  });

  it('names each issue once', () => {
    expect(closedIssueNumbers('Closes #216\n\nFixes #216')).toEqual([216]);
  });

  it('reads nothing from an empty body', () => {
    expect(closedIssueNumbers('')).toEqual([]);
  });
});
