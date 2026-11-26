import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const script = join(import.meta.dirname, 'check-host-env-lines.js');

let repo;
const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' });

/** Commits `compose`, as the pull request's merge commit would carry it. */
function commitCompose(compose) {
  writeFileSync(join(repo, 'compose.yaml'), compose);
  git('add', 'compose.yaml');
  git('commit', '--quiet', '-m', 'change compose.yaml');
}

/** Runs the check on the pull request described; resolves to its exit code and stderr. */
function check({ base = 'main', body = '' } = {}) {
  try {
    execFileSync('node', [script], {
      cwd: repo,
      encoding: 'utf8',
      stdio: 'pipe',
      env: { ...process.env, BASE_REF: base, PR_BODY: body },
    });
    return { code: 0, stderr: '' };
  } catch (error) {
    return { code: error.status, stderr: error.stderr };
  }
}

const MAIN_COMPOSE = `services:
  api:
    environment:
      READER_DATABASE_URL: postgres://reader:\${READER_PASSWORD:?set READER_PASSWORD in .env}@postgres/app
      SITE_ADDRESS: \${SITE_ADDRESS:-localhost}
`;

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), 'check-host-env-lines-'));
  git('init', '--quiet', '--initial-branch=main');
  git('config', 'user.name', 'test');
  git('config', 'user.email', 'test@example.com');
  git('config', 'commit.gpgsign', 'false');
  writeFileSync(join(repo, 'compose.yaml'), MAIN_COMPOSE);
  git('add', '.');
  git('commit', '--quiet', '-m', 'initial state of main');
});

afterEach(() => rmSync(repo, { recursive: true, force: true }));

describe('check-host-env-lines', () => {
  it('fails a release that requires a new variable of the host without saying it is there', () => {
    commitCompose(
      `${MAIN_COMPOSE}  umami:
    environment:
      APP_SECRET: \${UMAMI_APP_SECRET:?set UMAMI_APP_SECRET in .env}
`,
    );

    const result = check();

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('Host .env: UMAMI_APP_SECRET');
  });

  it('passes a release whose description has a line for each new variable', () => {
    commitCompose(
      `${MAIN_COMPOSE}  umami:
    environment:
      APP_SECRET: \${UMAMI_APP_SECRET:?set UMAMI_APP_SECRET in .env}
      DATABASE_URL: postgres://umami:\${UMAMI_DATABASE_PASSWORD:?set it}@postgres/umami
`,
    );

    const result = check({
      body: 'Adds Umami.\n\nHost .env: UMAMI_APP_SECRET\r\n  Host .env: UMAMI_DATABASE_PASSWORD  \n',
    });

    expect(result.code).toBe(0);
  });

  it('names only the new variables its description leaves out', () => {
    commitCompose(
      `${MAIN_COMPOSE}  umami:
    environment:
      APP_SECRET: \${UMAMI_APP_SECRET:?set UMAMI_APP_SECRET in .env}
      DATABASE_URL: postgres://umami:\${UMAMI_DATABASE_PASSWORD:?set it}@postgres/umami
`,
    );

    const result = check({ body: 'Host .env: UMAMI_APP_SECRET' });

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('Host .env: UMAMI_DATABASE_PASSWORD');
    expect(result.stderr).not.toContain('Host .env: UMAMI_APP_SECRET');
    expect(result.stderr).not.toContain('READER_PASSWORD');
  });

  it('does not count a sentence that only mentions the line', () => {
    commitCompose(`${MAIN_COMPOSE}      SECRET: \${NEW_SECRET:?set NEW_SECRET in .env}\n`);

    const result = check({ body: 'Remember to write Host .env: NEW_SECRET on the VPS.' });

    expect(result.code).toBe(1);
  });

  it('asks for nothing when the variable was already required on main', () => {
    commitCompose(
      `${MAIN_COMPOSE}  importer:
    environment:
      OWNER: postgres://reader:\${READER_PASSWORD:?set READER_PASSWORD in .env}@postgres/app
`,
    );

    expect(check().code).toBe(0);
  });

  it('asks for nothing when a new variable has a default', () => {
    commitCompose(`${MAIN_COMPOSE}      PING_URL: \${HEALTHCHECKS_PING_URL:-}\n`);

    expect(check().code).toBe(0);
  });

  it('counts a variable required without the colon, which only an unset one stops', () => {
    commitCompose(`${MAIN_COMPOSE}      SECRET: \${NEW_SECRET?set NEW_SECRET in .env}\n`);

    const result = check();

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('Host .env: NEW_SECRET');
  });

  it('passes a pull request into a spec branch, which deploys nothing', () => {
    commitCompose(`${MAIN_COMPOSE}      SECRET: \${NEW_SECRET:?set NEW_SECRET in .env}\n`);

    expect(check({ base: 'spec/monitoring' }).code).toBe(0);
  });
});
