import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const WORKFLOWS = '.github/workflows/';
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const ruleset = (name) => JSON.parse(read(`.github/rulesets/${name}.json`));
const ruleOf = (set, type) => set.rules.find((rule) => rule.type === type);

/** The top-level keys of a workflow's `jobs:` block: the names its checks report under. */
function jobIds(workflow) {
  const jobs = workflow.slice(workflow.indexOf('\njobs:\n'));
  return [...jobs.matchAll(/^ {2}([\w-]+):$/gm)].map(([, id]) => id);
}

/** Whether a workflow starts on a pull request, so its checks can be required to merge one. */
const runsOnPullRequests = (workflow) => /^on:\n(?: .*\n)*? {2}pull_request:/m.test(workflow);

const pullRequestJobIds = readdirSync(new URL(`../${WORKFLOWS}`, import.meta.url))
  .filter((file) => file.endsWith('.yml'))
  .map((file) => read(WORKFLOWS + file))
  .filter(runsOnPullRequests)
  .flatMap(jobIds);

describe('the protect-main ruleset', () => {
  const protectMain = ruleset('protect-main');

  it('protects main and every spec branch', () => {
    expect(protectMain.conditions.ref_name.include).toEqual([
      'refs/heads/main',
      'refs/heads/spec/**',
    ]);
  });

  it('requires every job of the workflows that run on pull requests', () => {
    const required = ruleOf(protectMain, 'required_status_checks').parameters;

    expect(required.required_status_checks.map((check) => check.context).sort()).toEqual(
      [...pullRequestJobIds].sort(),
    );
    expect(pullRequestJobIds).toContain('release-entry');
    expect(pullRequestJobIds).toContain('spec-release-readme');
  });

  it('lets a spec branch be deleted after its release', () => {
    expect(ruleOf(protectMain, 'deletion')).toBeUndefined();
  });
});

describe('the block-main-deletion ruleset', () => {
  it('keeps main from being deleted, and nothing else', () => {
    const blockMainDeletion = ruleset('block-main-deletion');

    expect(blockMainDeletion.conditions.ref_name.include).toEqual(['refs/heads/main']);
    expect(blockMainDeletion.rules).toEqual([{ type: 'deletion' }]);
  });
});

describe.each(['protect-main', 'block-main-deletion'])('the %s ruleset', (name) => {
  it('lets nobody bypass it, the owner included', () => {
    expect(ruleset(name).bypass_actors).toEqual([]);
  });
});
