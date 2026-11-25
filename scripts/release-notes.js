// Prints the GitHub Release notes of the tag given as argument (`v0.2.0`): the commit subjects
// since the previous `v*` tag, grouped by Conventional Commits type (ADR 0025). The deploy
// workflow runs it on the deployed commit, with the history and the tags fetched.
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const CONVENTIONAL = /^(?<type>[a-z]+)(?:\((?<scope>[^)]+)\))?(?<breaking>!)?: (?<description>.+)$/;
const MERGE = /^Merge (pull request|branch|remote-tracking branch) /;

/** Each Conventional Commits type's heading, in the order the notes list them. */
const HEADINGS = new Map([
  ['feat', 'Features'],
  ['fix', 'Fixes'],
  ['perf', 'Performance'],
  ['refactor', 'Refactoring'],
  ['docs', 'Documentation'],
  ['test', 'Tests'],
  ['build', 'Build'],
  ['ci', 'CI'],
  ['chore', 'Chores'],
  ['revert', 'Reverts'],
]);
/** The heading of a subject that is not Conventional Commits, or whose type has no heading. */
const OTHER = 'Other';

/** The heading a commit subject goes under, and its line there. */
function headingAndLine(subject) {
  const commit = subject.match(CONVENTIONAL)?.groups;
  const heading = commit && HEADINGS.get(commit.type);
  if (!heading) return [OTHER, `- ${subject}`];
  const { scope, breaking, description } = commit;
  return [
    heading,
    `- ${scope ? `**${scope}:** ` : ''}${description}${breaking ? ' (breaking)' : ''}`,
  ];
}

/**
 * The release's notes in Markdown: the commit `subjects` since `previousTag`, grouped by type,
 * merge commits left out. Without a previous tag the release is the first one.
 */
export function releaseNotes({ previousTag, subjects }) {
  if (!previousTag) return 'The first tagged release. CHANGELOG.md says what it holds.\n';

  const groups = new Map([...HEADINGS.values(), OTHER].map((heading) => [heading, []]));
  for (const subject of subjects.filter((subject) => !MERGE.test(subject))) {
    const [heading, line] = headingAndLine(subject);
    groups.get(heading).push(line);
  }
  const listed = [...groups].filter(([, lines]) => lines.length > 0);
  if (listed.length === 0) return `No commits since ${previousTag}.\n`;
  return listed.flatMap(([heading, lines]) => [`## ${heading}`, '', ...lines, '']).join('\n');
}

// stdio 'pipe' keeps git's own messages, such as describe's "No names found", out of the notes' log.
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: 'pipe' });

/** The latest `v*` tag reachable from HEAD other than `tag`; undefined before the first one. */
function previousTagOf(tag) {
  try {
    return git(
      'describe',
      '--tags',
      '--abbrev=0',
      '--match',
      'v[0-9]*',
      '--exclude',
      tag,
      'HEAD',
    ).trim();
  } catch {
    return undefined;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const tag = process.argv[2];
  if (!tag) {
    console.error('Usage: node scripts/release-notes.js <tag>, such as v0.2.0');
    process.exit(1);
  }
  const previousTag = previousTagOf(tag);
  const subjects = previousTag
    ? git('log', '--format=%s', `${previousTag}..HEAD`).split('\n').filter(Boolean)
    : [];
  process.stdout.write(releaseNotes({ previousTag, subjects }));
}
