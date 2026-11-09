// Rejects staged edits to accepted ADRs, except their status line (ADR 0008).
// An ADR is accepted once it is on `main`; until then it is a draft on its branch.
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const ADR_DIR = 'docs/adr/';
const STATUS_LINE = /^\*\*Status:\*\*/;

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' });

function acceptedRef() {
  for (const ref of ['main', 'origin/main']) {
    try {
      git('rev-parse', '--verify', '--quiet', ref);
      return ref;
    } catch {
      // Try the next ref.
    }
  }
  return 'HEAD';
}

function isAccepted(ref, path) {
  try {
    git('cat-file', '-e', `${ref}:${path}`);
    return true;
  } catch {
    return false;
  }
}

/** Lines added or removed by the staged diff of `path`, without the diff headers. */
function editedLines(path) {
  const lines = git('diff', '--cached', '--unified=0', '--', path).split('\n');
  const firstHunk = lines.findIndex((line) => line.startsWith('@@'));
  return lines
    .slice(firstHunk)
    .filter((line) => line.startsWith('+') || line.startsWith('-'))
    .map((line) => line.slice(1));
}

export function adrViolations() {
  const ref = acceptedRef();
  const changes = git('diff', '--cached', '--name-status', '-M', '--', ADR_DIR)
    .split('\n')
    .filter(Boolean)
    .map((line) => line.split('\t'));
  const violations = [];
  for (const [status, path, renamedTo] of changes) {
    if (!isAccepted(ref, path)) continue;
    if (status.startsWith('R')) violations.push(`${path}: renamed to ${renamedTo}`);
    else if (status === 'D') violations.push(`${path}: deleted`);
    else if (editedLines(path).some((line) => !STATUS_LINE.test(line)))
      violations.push(`${path}: edited beyond its status line`);
  }
  return violations;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const violations = adrViolations();
  if (violations.length > 0) {
    console.error(
      [
        'pre-commit: accepted ADRs are immutable (docs/adr/0008).',
        ...violations.map((violation) => `  ${violation}`),
        'Write a new ADR and set the old one\'s status to "superseded by ADR NNNN".',
      ].join('\n'),
    );
    process.exit(1);
  }
}
