// Fails a pull request to `main` that does not declare its release: a CHANGELOG.md entry on top
// and a package.json version above main's (ADR 0025). A pull request to any other branch passes.
// CI runs it on the pull request's merge commit, whose first parent is the base branch.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import {
  changelogEntries,
  changesOf,
  SECTION_HEADINGS,
} from '../packages/web/src/online-release/changelog.ts';
import { isAbove, isSemVer } from '../packages/web/src/online-release/online-release.ts';

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const { news, fixes } = SECTION_HEADINGS;
const NO_CHANGE = `The top entry lists no change: add "### ${news}" or "### ${fixes}" with at least one "- " item.`;

/** Whether the entry lists at least one change. */
function hasChange(entry) {
  const changes = changesOf(entry);
  return changes.news.length + changes.fixes.length > 0;
}

function isRealDay(date) {
  const parts = date.match(DATE);
  if (!parts) return false;
  const [year, month, day] = parts.slice(1).map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

/**
 * What keeps a pull request to `main` from being a release (ADR 0025): the top entry of
 * `changelog`, the pull request's `appVersion` in package.json and `main`'s, which counts as
 * 0.0.0 when it has none. Empty when the pull request is ready.
 */
export function releaseErrors({ changelog, appVersion, mainAppVersion = '0.0.0' }) {
  const [entry] = changelogEntries(changelog);
  const hasVersion = isSemVer(appVersion ?? '');
  if (!entry) {
    const example = hasVersion ? appVersion : 'X.Y.Z';
    return [`CHANGELOG.md has no entry. Add one at the top: "## ${example} — YYYY-MM-DD".`];
  }

  const errors = [];
  if (!entry.title.includes('—')) {
    // A hyphen or an en dash in its place would only read as a wrong version.
    const fixed = entry.title.replace(/\s+[-–]+\s+/, ' — ');
    errors.push(
      `The top entry's heading splits its version and date with an em dash: "## ${fixed}".`,
    );
    if (!hasChange(entry)) errors.push(NO_CHANGE);
    return errors;
  }
  const entryHasVersion = isSemVer(entry.version);
  if (!hasVersion)
    errors.push(
      `package.json's version "${appVersion ?? ''}" is not MAJOR.MINOR.PATCH: write "version": "${entryHasVersion ? entry.version : 'X.Y.Z'}".`,
    );
  if (!entryHasVersion)
    errors.push(
      `The top entry's version "${entry.version}" is not MAJOR.MINOR.PATCH, like "${hasVersion ? appVersion : 'X.Y.Z'}".`,
    );
  else if (hasVersion && entry.version !== appVersion)
    errors.push(
      `The top entry is ${entry.version} but package.json says ${appVersion}: write the same version in both.`,
    );
  if (hasVersion && !isAbove(appVersion, mainAppVersion))
    errors.push(
      `Version ${appVersion} is not above main's: main is at ${mainAppVersion}. Raise the minor for a feat, the patch otherwise.`,
    );
  if (!isRealDay(entry.date))
    errors.push(
      `The top entry's date "${entry.date}" is not a real day written YYYY-MM-DD, like "2026-12-01".`,
    );
  if (!hasChange(entry)) errors.push(NO_CHANGE);
  return errors;
}

/** `main`'s app version: the first parent of the merge commit is the base branch. */
function mainAppVersion() {
  const packageJson = execFileSync('git', ['show', 'HEAD^1:package.json'], { encoding: 'utf8' });
  return JSON.parse(packageJson).version;
}

if (
  import.meta.url === pathToFileURL(process.argv[1] ?? '').href &&
  process.env.BASE_REF === 'main'
) {
  const errors = releaseErrors({
    changelog: existsSync('CHANGELOG.md') ? readFileSync('CHANGELOG.md', 'utf8') : '',
    appVersion: JSON.parse(readFileSync('package.json', 'utf8')).version,
    mainAppVersion: mainAppVersion(),
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
