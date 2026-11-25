import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const script = join(import.meta.dirname, 'check-spec-release-readme.js');

let repo;
const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' });

/** Commits a change to `path`, as the pull request's merge commit would carry it. */
function commitChangeTo(path) {
  writeFileSync(join(repo, path), 'changed\n');
  git('add', path);
  git('commit', '--quiet', '-m', `change ${path}`);
}

/** Runs the check on the pull request described; resolves to its exit code and stderr. */
function check({ head, base, body = '' }) {
  try {
    execFileSync('node', [script], {
      cwd: repo,
      encoding: 'utf8',
      stdio: 'pipe',
      env: { ...process.env, HEAD_REF: head, BASE_REF: base, PR_BODY: body },
    });
    return { code: 0, stderr: '' };
  } catch (error) {
    return { code: error.status, stderr: error.stderr };
  }
}

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), 'check-spec-release-readme-'));
  git('init', '--quiet', '--initial-branch=main');
  git('config', 'user.name', 'test');
  git('config', 'user.email', 'test@example.com');
  git('config', 'commit.gpgsign', 'false');
  writeFileSync(join(repo, 'README.md'), '# App\n');
  writeFileSync(join(repo, 'app.js'), 'app\n');
  git('add', '.');
  git('commit', '--quiet', '-m', 'initial state of main');
});

afterEach(() => rmSync(repo, { recursive: true, force: true }));

describe('check-spec-release-readme', () => {
  it('fails a spec release that leaves the README untouched without saying why', () => {
    commitChangeTo('app.js');

    const result = check({ head: 'spec/error-monitoring', base: 'main' });

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('README.md');
    expect(result.stderr).toContain('README: no change needed');
  });

  it('passes a spec release whose description says the README needs no change', () => {
    commitChangeTo('app.js');
    const body = 'Releases error monitoring.\r\n\r\nREADME: no change needed\r\n';

    expect(check({ head: 'spec/error-monitoring', base: 'main', body }).code).toBe(0);
  });

  it('does not take a sentence that only mentions the line as saying so', () => {
    commitChangeTo('app.js');
    const body = 'I forgot to write `README: no change needed`.';

    expect(check({ head: 'spec/error-monitoring', base: 'main', body }).code).toBe(1);
  });

  it('passes a spec release that changes the README', () => {
    commitChangeTo('README.md');

    expect(check({ head: 'spec/error-monitoring', base: 'main' }).code).toBe(0);
  });

  it('passes a lone ticket to main without looking at the README', () => {
    commitChangeTo('app.js');

    expect(check({ head: 'fix/print-picker-scroll', base: 'main' }).code).toBe(0);
  });

  it("passes a spec ticket to its spec branch: the spec's release reviews the README", () => {
    commitChangeTo('app.js');

    expect(check({ head: 'feat/error-reporting', base: 'spec/error-monitoring' }).code).toBe(0);
  });
});
