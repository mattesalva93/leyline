import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const script = join(import.meta.dirname, 'check-theme.js');
const repoRoot = join(import.meta.dirname, '..');
const appTheme = readFileSync(join(repoRoot, 'packages/web/src/theme.css'), 'utf8');
const appPage = readFileSync(join(repoRoot, 'packages/web/index.html'), 'utf8');
const appPalette = readFileSync(
  join(repoRoot, 'packages/web/src/workspace/sibling-group-colours.ts'),
  'utf8',
);

let dir;

/**
 * Runs the check on a theme, a page and the card grid's sibling palette, `paletteSize` colours
 * long if given; resolves to its exit code and stderr.
 */
function check({ theme = appTheme, page = appPage, paletteSize } = {}) {
  const themePath = join(dir, 'theme.css');
  const pagePath = join(dir, 'index.html');
  const palettePath = join(dir, 'sibling-group-colours.ts');
  writeFileSync(themePath, theme);
  writeFileSync(pagePath, page);
  writeFileSync(
    palettePath,
    paletteSize === undefined
      ? appPalette
      : appPalette.replace(/SIBLING_PALETTE_SIZE = \d+/, `SIBLING_PALETTE_SIZE = ${paletteSize}`),
  );
  try {
    execFileSync('node', [script, themePath, pagePath, palettePath], {
      encoding: 'utf8',
      stdio: 'pipe',
    });
    return { code: 0, stderr: '' };
  } catch (error) {
    return { code: error.status, stderr: error.stderr };
  }
}

/** The app's theme with one token of the light (`@theme`) or the dark (`.dark`) block changed. */
function themeWith(block, token, value) {
  const start = appTheme.indexOf(block === 'light' ? '@theme static {' : '.dark {');
  const tokenStart = appTheme.indexOf(`--color-${token}:`, start);
  const tokenEnd = appTheme.indexOf(';', tokenStart);
  return `${appTheme.slice(0, tokenStart)}--color-${token}: ${value}${appTheme.slice(tokenEnd)}`;
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'check-theme-'));
});

afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('check-theme', () => {
  it("accepts the app's theme and page", () => {
    expect(check()).toEqual({ code: 0, stderr: '' });
  });

  it('rejects text under 4.5:1, naming the theme and the pair (WCAG 1.4.3)', () => {
    // #777777 on white is 4.48:1, the classic just-too-light grey.
    const theme = themeWith('light', 'panel', '#ffffff').replace(
      /(@theme static \{[^}]*--color-muted-foreground: )#[0-9a-f]+/,
      '$1#777777',
    );

    const result = check({ theme });

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('light theme: muted-foreground on panel is 4.48:1');
  });

  it('rejects a border under 3:1 in the dark theme only (WCAG 1.4.11)', () => {
    const result = check({ theme: themeWith('dark', 'border', '#5a5a55') });

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('dark theme: border on panel');
    expect(result.stderr).not.toContain('light theme');
  });

  it('rejects a sibling group colour under 4.5:1 on the board or under the quantity on its tab', () => {
    const result = check({ theme: themeWith('dark', 'sibling-2', '#3a3a3a') });

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('dark theme: sibling-2 on background');
    expect(result.stderr).toContain('dark theme: panel on sibling-2');
  });

  it('rejects a theme whose sibling tokens are not the palette the card grid cycles through', () => {
    const theme = appTheme.replace(/\n\s*--color-sibling-4: #[0-9a-f]+;(?=[^]*\.dark \{)/, '');

    const result = check({ theme, paletteSize: 5 });

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('light theme: no --color-sibling-4');
    expect(result.stderr).toContain('light theme: no --color-sibling-5');
    expect(result.stderr).toContain('dark theme: no --color-sibling-5');
    expect(result.stderr).not.toContain('dark theme: no --color-sibling-4');
  });

  it('rejects a sibling token beyond the palette the card grid cycles through', () => {
    const result = check({ paletteSize: 3 });

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('light theme: --color-sibling-4 is beyond the palette of 3');
  });

  it('rejects a font family the theme does not bundle from @fontsource', () => {
    const theme = appTheme.replace("@import '@fontsource-variable/jetbrains-mono';\n", '');

    const result = check({ theme });

    expect(result.code).toBe(1);
    expect(result.stderr).toContain(
      "'JetBrains Mono Variable' is not bundled: no @import '@fontsource-variable/jetbrains-mono'",
    );
  });

  it('rejects a stylesheet or a font asked of an outside service', () => {
    const page = appPage.replace(
      '</head>',
      '  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter" />\n  </head>',
    );

    const result = check({ page });

    expect(result.code).toBe(1);
    expect(result.stderr).toContain(
      'index.html asks an outside service: https://fonts.googleapis.com',
    );
  });
});
