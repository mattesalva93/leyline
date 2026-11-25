// Fails a spec's release (a pull request from `spec/<change>` to `main`, ADR 0024) that neither
// changes the README nor says it needs no change. See "A spec's release keeps the README current"
// in CODING_STANDARDS.md.
// CI runs it on the pull request's merge commit, whose first parent is the base branch.
import { execFileSync } from 'node:child_process';

const README = 'README.md';
const NO_CHANGE_LINE = 'README: no change needed';

const { HEAD_REF = '', BASE_REF = '', PR_BODY = '' } = process.env;

function changedFiles() {
  return execFileSync('git', ['diff', '--name-only', 'HEAD^1', 'HEAD'], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
}

// A line of its own, so a sentence that only mentions it does not count.
const saysNoChangeNeeded = PR_BODY.split(/\r?\n/).some((line) => line.trim() === NO_CHANGE_LINE);

const failures = [];
if (
  HEAD_REF.startsWith('spec/') &&
  BASE_REF === 'main' &&
  !saysNoChangeNeeded &&
  !changedFiles().includes(README)
) {
  failures.push(
    `${HEAD_REF} releases a spec to main without changing ${README}.`,
    `Update ${README} (the app's description, its screenshots, its Roadmap), or, if it is still`,
    `current, add this line to the pull request's description: ${NO_CHANGE_LINE}`,
  );
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}
