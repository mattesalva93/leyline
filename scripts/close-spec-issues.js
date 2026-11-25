// Closes the issues a merged pull request to a `spec/` branch names with `Closes #N` (ADR 0024).
// GitHub reads those keywords only on pull requests to the default branch: on a spec branch they
// stay text, and the ticket would stay open until the whole spec reached main.
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

/** GitHub's closing keywords, each right before the `#N` it closes, as a word of its own. */
const CLOSING_REFERENCE = /(?<!\w)(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s*:?\s*#(\d+)\b/gi;

/** The issues `body` closes, in the order it names them, each once. */
export function closedIssueNumbers(body) {
  const numbers = [...body.matchAll(CLOSING_REFERENCE)].map(([, number]) => Number(number));
  return [...new Set(numbers)];
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const { PR_BODY = '', PR_NUMBER, BASE_REF } = process.env;
  for (const issue of closedIssueNumbers(PR_BODY)) {
    // `gh` takes the repository and the token from the workflow's environment.
    execFileSync(
      'gh',
      [
        ...['issue', 'close', String(issue), '--reason', 'completed'],
        ...['--comment', `Chiuso con #${PR_NUMBER}, unita in \`${BASE_REF}\`.`],
      ],
      { stdio: 'inherit' },
    );
  }
}
