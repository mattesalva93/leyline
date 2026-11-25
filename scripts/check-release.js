// Fails a pull request to `main` that does not declare its release: a CHANGELOG.md entry on top
// and a package.json version above main's (ADR 0025). A pull request to any other branch passes.
// CI runs it on the pull request's merge commit, whose first parent is the base branch.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const ENTRY_HEADING = /^## (.+)$/m;
const SECTIONS = ['Novità', 'Correzioni'];
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * The top entry of the changelog: its heading split at the dash, and its lines up to the next
 * entry. Undefined when there is none.
 */
function topEntry(changelog) {
  const heading = changelog.match(ENTRY_HEADING);
  if (!heading) return undefined;
  const [version = '', date = ''] = heading[1].split('—').map((part) => part.trim());
  const rest = changelog.slice(heading.index + heading[0].length);
  const nextEntry = rest.search(ENTRY_HEADING);
  const lines = (nextEntry === -1 ? rest : rest.slice(0, nextEntry)).split(/\r?\n/);
  return { version, date, lines };
}

/** Whether the entry has a "### Novità" or "### Correzioni" with at least one bullet. */
function hasFilledSection(lines) {
  let section;
  for (const line of lines) {
    if (line.startsWith('### ')) section = line.slice(4).trim();
    else if (SECTIONS.includes(section) && /^- \S/.test(line)) return true;
  }
  return false;
}

function isRealDay(date) {
  const parts = date.match(DATE);
  if (!parts) return false;
  const [year, month, day] = parts.slice(1).map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

/** Whether SemVer `a` is above `b`; both are MAJOR.MINOR.PATCH. */
function isAbove(a, b) {
  const [left, right] = [a, b].map((v) => v.split('.').map(Number));
  const differing = left.findIndex((part, index) => part !== right[index]);
  return differing !== -1 && left[differing] > right[differing];
}

/**
 * What keeps a pull request to `main` from being a release (ADR 0025): the top entry of
 * `changelog`, the pull request's `version` in package.json and `main`'s, which counts as
 * 0.0.0 when it has none. Empty when the pull request is ready.
 */
export function releaseErrors({ changelog, version, mainVersion = '0.0.0' }) {
  const entry = topEntry(changelog);
  const hasVersion = SEMVER.test(version ?? '');
  const example = hasVersion ? version : 'X.Y.Z';
  if (!entry)
    return [`CHANGELOG.md has no entry. Add one at the top: "## ${example} — YYYY-MM-DD".`];

  const errors = [];
  if (!hasVersion)
    errors.push(
      `package.json's version "${version ?? ''}" is not MAJOR.MINOR.PATCH: write "version": "${SEMVER.test(entry.version) ? entry.version : 'X.Y.Z'}".`,
    );
  if (!SEMVER.test(entry.version))
    errors.push(
      `The top entry's version "${entry.version}" is not MAJOR.MINOR.PATCH, like "${example}".`,
    );
  else if (hasVersion && entry.version !== version)
    errors.push(
      `The top entry is ${entry.version} but package.json says ${version}: write the same version in both.`,
    );
  if (hasVersion && !isAbove(version, mainVersion))
    errors.push(
      `Version ${version} is not above main's: main is at ${mainVersion}. Raise the minor for a feat, the patch otherwise.`,
    );
  if (!isRealDay(entry.date))
    errors.push(
      `The top entry's date "${entry.date}" is not a real day written YYYY-MM-DD, like "2026-12-01".`,
    );
  if (!hasFilledSection(entry.lines))
    errors.push(
      `The top entry lists no change: add "### Novità" or "### Correzioni" with at least one "- " item.`,
    );
  return errors;
}

/** `main`'s version: the first parent of the merge commit is the base branch. */
function mainVersion() {
  const packageJson = execFileSync('git', ['show', 'HEAD^1:package.json'], { encoding: 'utf8' });
  return JSON.parse(packageJson).version;
}

if (
  import.meta.url === pathToFileURL(process.argv[1] ?? '').href &&
  process.env.BASE_REF === 'main'
) {
  const errors = releaseErrors({
    changelog: existsSync('CHANGELOG.md') ? readFileSync('CHANGELOG.md', 'utf8') : '',
    version: JSON.parse(readFileSync('package.json', 'utf8')).version,
    mainVersion: mainVersion(),
  });
  if (errors.length > 0) {
    console.error(
      [
        'A pull request to main is a release: it writes the new version in package.json and its',
        'entry on top of CHANGELOG.md, in Italian (ADR 0025).',
        ...errors.map((error) => `  ${error}`),
      ].join('\n'),
    );
    process.exit(1);
  }
}
