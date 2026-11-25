import { describe, expect, it } from 'vitest';
import { releaseErrors } from './check-release.js';

const entry = (heading, body = '### Novità\n\n- Il generatore stampa i proxy in PDF.\n') =>
  `# Changelog\n\n${heading}\n\n${body}`;

describe('releaseErrors', () => {
  it('passes a pull request whose top entry names its version above main', () => {
    const changelog = entry('## 0.2.0 — 2026-12-01');

    expect(releaseErrors({ changelog, version: '0.2.0', mainVersion: '0.1.0' })).toEqual([]);
  });

  it('fails a changelog with no entry and says how to write one', () => {
    const errors = releaseErrors({
      changelog: '# Changelog\n',
      version: '0.2.0',
      mainVersion: '0.1.0',
    });

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('## 0.2.0 — YYYY-MM-DD');
  });

  it.each(['0.2', 'v0.2.0', '0.02.0', '0.2.0-beta'])(
    'fails a top entry whose version %s is not MAJOR.MINOR.PATCH',
    (written) => {
      const errors = releaseErrors({
        changelog: entry(`## ${written} — 2026-12-01`),
        version: '0.2.0',
        mainVersion: '0.1.0',
      });

      expect(errors.some((error) => error.includes(`"${written}"`))).toBe(true);
    },
  );

  it('fails a top entry whose version differs from package.json', () => {
    const errors = releaseErrors({
      changelog: entry('## 0.3.0 — 2026-12-01'),
      version: '0.2.0',
      mainVersion: '0.1.0',
    });

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('0.3.0');
    expect(errors[0]).toContain('package.json');
  });

  it('fails a package.json without a MAJOR.MINOR.PATCH version', () => {
    const errors = releaseErrors({
      changelog: entry('## 0.2.0 — 2026-12-01'),
      version: undefined,
      mainVersion: '0.1.0',
    });

    expect(errors).toEqual([expect.stringContaining('"version": "0.2.0"')]);
  });

  it.each([
    ['equal to', '0.2.0'],
    ['below', '0.10.0'],
  ])('fails a pull request whose version is %s main', (_, mainVersion) => {
    const errors = releaseErrors({
      changelog: entry('## 0.2.0 — 2026-12-01'),
      version: '0.2.0',
      mainVersion,
    });

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain(`main is at ${mainVersion}`);
  });

  it('counts a main without a version as 0.0.0', () => {
    const changelog = entry('## 0.1.0 — 2026-11-24');

    expect(releaseErrors({ changelog, version: '0.1.0', mainVersion: undefined })).toEqual([]);
    expect(releaseErrors({ changelog: entry('## 0.0.0 — 2026-11-24'), version: '0.0.0' })).toEqual([
      expect.stringContaining('main is at 0.0.0'),
    ]);
  });

  it('passes a top entry with only "Correzioni"', () => {
    const changelog = entry(
      '## 0.1.1 — 2026-12-01',
      '### Correzioni\n\n- La stampa non taglia più il bordo.\n',
    );

    expect(releaseErrors({ changelog, version: '0.1.1', mainVersion: '0.1.0' })).toEqual([]);
  });

  it.each([
    ['no section', 'Qualche miglioria.\n'],
    ['only empty sections', '### Novità\n\n### Correzioni\n\n'],
    ['a section other than Novità and Correzioni', '### Altro\n\n- Una modifica.\n'],
  ])('fails a top entry with %s', (_, body) => {
    const errors = releaseErrors({
      changelog: entry('## 0.2.0 — 2026-12-01', body),
      version: '0.2.0',
      mainVersion: '0.1.0',
    });

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('### Novità');
    expect(errors[0]).toContain('### Correzioni');
  });

  it('reads only the top entry, not the sections of the entries below it', () => {
    const changelog = [
      '# Changelog',
      '## 0.2.0 — 2026-12-01',
      '## 0.1.0 — 2026-11-24',
      '### Novità',
      '- La prima alpha.',
    ].join('\n\n');

    expect(releaseErrors({ changelog, version: '0.2.0', mainVersion: '0.1.0' })).toHaveLength(1);
  });

  it.each(['2026-12-1', '01-12-2026', '2026-13-01', '2026-02-30', ''])(
    'fails a top entry whose date "%s" is not a real YYYY-MM-DD day',
    (date) => {
      const errors = releaseErrors({
        changelog: entry(`## 0.2.0 — ${date}`),
        version: '0.2.0',
        mainVersion: '0.1.0',
      });

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('YYYY-MM-DD');
    },
  );
});
