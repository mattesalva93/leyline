import { execFileSync } from 'node:child_process';
import { mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const script = join(import.meta.dirname, 'check-adrs.js');
const adr = 'docs/adr/0001-example.md';
const accepted = '# 0001: Example\n\n**Status:** accepted (2026-11-01)\n\nWe decided X.\n';

let repo;
const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' });
const write = (path, text) => writeFileSync(join(repo, path), text);

/** Runs the check on the staged changes; resolves to its exit code and stderr. */
function check() {
  try {
    execFileSync('node', [script], { cwd: repo, encoding: 'utf8', stdio: 'pipe' });
    return { code: 0, stderr: '' };
  } catch (error) {
    return { code: error.status, stderr: error.stderr };
  }
}

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), 'check-adrs-'));
  git('init', '--quiet', '--initial-branch=main');
  git('config', 'user.name', 'test');
  git('config', 'user.email', 'test@example.com');
  git('config', 'commit.gpgsign', 'false');
  execFileSync('mkdir', ['-p', 'docs/adr'], { cwd: repo });
  write(adr, accepted);
  git('add', '.');
  git('commit', '--quiet', '-m', 'accept ADR 0001');
  git('switch', '--quiet', '-c', 'feature');
});

afterEach(() => rmSync(repo, { recursive: true, force: true }));

describe('check-adrs', () => {
  it('rejects an edit to the body of an ADR on main', () => {
    write(adr, accepted.replace('We decided X.', 'We decided Y.'));
    git('add', adr);

    const result = check();

    expect(result.code).toBe(1);
    expect(result.stderr).toContain(`${adr}: edited beyond its status line`);
  });

  it('accepts a change to the status line only', () => {
    write(adr, accepted.replace('accepted (2026-11-01)', 'superseded by ADR 0002'));
    git('add', adr);

    expect(check().code).toBe(0);
  });

  it('rejects deleting or renaming an ADR on main', () => {
    rmSync(join(repo, adr));
    git('add', adr);
    expect(check().stderr).toContain(`${adr}: deleted`);

    git('reset', '--quiet', '--hard');
    renameSync(join(repo, adr), join(repo, 'docs/adr/0001-renamed.md'));
    git('add', 'docs/adr');
    expect(check().stderr).toContain(`${adr}: renamed`);
  });

  it('accepts a new ADR, and edits to it while it is still a draft on its branch', () => {
    const draft = 'docs/adr/0002-draft.md';
    write(draft, '# 0002: Draft\n\nFirst wording.\n');
    git('add', draft);
    expect(check().code).toBe(0);

    git('commit', '--quiet', '-m', 'draft ADR 0002');
    write(draft, '# 0002: Draft\n\nBetter wording.\n');
    git('add', draft);
    expect(check().code).toBe(0);
  });

  it('ignores files outside docs/adr', () => {
    write('README.md', 'anything');
    git('add', 'README.md');

    expect(check().code).toBe(0);
  });
});
