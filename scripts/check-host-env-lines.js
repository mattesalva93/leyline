// Fails a pull request to `main` whose compose.yaml requires a variable main's does not, unless
// its description says, with a line `Host .env: NAME` for each, that the host's `.env` has it
// (ADR 0030). The deploy never writes the host's `.env` (ADR 0012), so a release that needs a new
// line there fails to deploy until the owner adds it.
// CI runs it on the pull request's merge commit, whose first parent is the base branch.
import { execFileSync } from 'node:child_process';

const COMPOSE = 'compose.yaml';
const LINE_PREFIX = 'Host .env: ';

/** The variables compose.yaml stops without: `${NAME:?message}` or `${NAME?message}`. */
function requiredVariables(compose) {
  return new Set([...compose.matchAll(/\$\{(\w+):?\?/g)].map(([, name]) => name));
}

function composeAt(revision) {
  return execFileSync('git', ['show', `${revision}:${COMPOSE}`], { encoding: 'utf8' });
}

const { BASE_REF = '', PR_BODY = '' } = process.env;

if (BASE_REF === 'main') {
  const onMain = requiredVariables(composeAt('HEAD^1'));
  // A line of its own, so a sentence that only mentions a variable does not count.
  const declared = new Set(
    PR_BODY.split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith(LINE_PREFIX))
      .map((line) => line.slice(LINE_PREFIX.length).trim()),
  );
  const undeclared = [...requiredVariables(composeAt('HEAD'))].filter(
    (name) => !onMain.has(name) && !declared.has(name),
  );

  if (undeclared.length > 0) {
    console.error(
      [
        `${COMPOSE} now requires variables the host's .env may lack, and the deploy never writes it.`,
        'Add each to the host\'s .env as docs/deploy.md says under "A release that needs a new line',
        "in the host's .env\", then add these lines to the pull request's description:",
        ...undeclared.map((name) => `${LINE_PREFIX}${name}`),
      ].join('\n'),
    );
    process.exit(1);
  }
}
