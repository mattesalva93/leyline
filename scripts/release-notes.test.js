import { describe, expect, it } from 'vitest';
import { releaseNotes } from './release-notes.js';

describe('releaseNotes', () => {
  it('groups features first, then fixes', () => {
    const notes = releaseNotes({
      previousTag: 'v0.1.0',
      subjects: [
        'fix: keep fetched PDF images after a PDF is made',
        'feat: tag the prints with an alternate name',
        'fix(core): resolve a line written with an alternate name',
      ],
    });

    expect(notes).toBe(
      [
        '## Features',
        '',
        '- tag the prints with an alternate name',
        '',
        '## Fixes',
        '',
        '- keep fetched PDF images after a PDF is made',
        '- **core:** resolve a line written with an alternate name',
        '',
      ].join('\n'),
    );
  });

  it('puts the other types after fixes, each under its own heading', () => {
    const notes = releaseNotes({
      previousTag: 'v0.1.0',
      subjects: [
        'chore(deps): update i18next to 27.2.7',
        'docs: define deck site',
        'refactor: read the stack base images in one place',
        'feat: list base images with a new digest',
        'ci: fail a spec release that leaves the README untouched',
        'test(api): pin the API thresholds',
      ],
    });

    expect(notes.match(/^## .+$/gm)).toEqual([
      '## Features',
      '## Refactoring',
      '## Documentation',
      '## Tests',
      '## CI',
      '## Chores',
    ]);
  });

  it('leaves merge commits out', () => {
    const notes = releaseNotes({
      previousTag: 'v0.1.0',
      subjects: [
        'Merge pull request #224 from mattesalva93/chore/base-image-digests',
        "Merge branch 'main' into spec/app-version",
        'fix: report a missing registry digest as unchecked',
      ],
    });

    expect(notes).toBe('## Fixes\n\n- report a missing registry digest as unchecked\n');
  });

  it('lists the subjects that are not Conventional Commits last, under "Other"', () => {
    const notes = releaseNotes({
      previousTag: 'v0.1.0',
      subjects: [
        'Add glossary, ADRs and coding standards',
        'wip: try a layout',
        'feat: open the alpha',
      ],
    });

    expect(notes).toBe(
      [
        '## Features',
        '',
        '- open the alpha',
        '',
        '## Other',
        '',
        '- Add glossary, ADRs and coding standards',
        '- wip: try a layout',
        '',
      ].join('\n'),
    );
  });

  it('says so when no commit came since the previous tag', () => {
    expect(releaseNotes({ previousTag: 'v0.1.0', subjects: [] })).toBe(
      'No commits since v0.1.0.\n',
    );
  });

  it('calls the first tag the first release, without listing the whole history', () => {
    expect(releaseNotes({ previousTag: undefined, subjects: [] })).toBe(
      'The first tagged release. CHANGELOG.md says what it holds.\n',
    );
  });

  it('marks a breaking change', () => {
    const notes = releaseNotes({ previousTag: 'v0.1.0', subjects: ['feat(api)!: drop /v1'] });

    expect(notes).toContain('- **api:** drop /v1 (breaking)');
  });
});
