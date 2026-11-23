// Checks the web theme, the one home of the design tokens (ADR 0010): there is one theme and it is
// dark (ADR 0020), every colour pair meets WCAG 2.2 AA, it holds the sibling palette the card grid
// cycles through, and fonts and stylesheets come from the app itself.
// Usage: node scripts/check-theme.js [theme.css] [index.html] [sibling-group-colours.ts]
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { pathToFileURL } from 'node:url';

const TEXT_MINIMUM = 4.5; // WCAG 1.4.3, text.
const NON_TEXT_MINIMUM = 3; // WCAG 1.4.11, the borders of controls.

/** Each colour of the theme drawn on top of another, with the contrast it needs. */
const PAIRS = [
  ...[
    ['foreground', 'background'],
    ['foreground', 'panel'],
    ['foreground', 'raised'],
    ['muted-foreground', 'background'],
    ['muted-foreground', 'panel'],
    ['muted-foreground', 'raised'],
    ['accent-foreground', 'accent'],
    ['accent-foreground', 'accent-hover'],
    ['chrome-foreground', 'chrome'],
    ['warning', 'panel'],
    ['warning', 'background'],
    ['danger', 'panel'],
    ['danger', 'background'],
    ['link', 'panel'],
    ['link', 'background'],
  ].map(([front, back]) => ({ front, back, minimum: TEXT_MINIMUM })),
  ...[
    ['border', 'background'],
    ['border', 'panel'],
    ['border', 'raised'],
    ['accent', 'chrome'],
    ['focus', 'background'],
    ['focus', 'panel'],
    ['selection-edge', 'background'],
  ].map(([front, back]) => ({ front, back, minimum: NON_TEXT_MINIMUM })),
];

/** The body of the first rule that opens with `opening` (its selector or at-rule, then `{`). */
function ruleBody(css, opening) {
  const start = css.indexOf(opening);
  if (start < 0) throw new Error(`theme.css has no "${opening}" rule`);
  return css.slice(start + opening.length, css.indexOf('}', start));
}

function colourTokens(block) {
  return new Map(
    [...block.matchAll(/--color-([\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map(([, name, value]) => [
      name,
      value,
    ]),
  );
}

function relativeLuminance(hex) {
  const [red, green, blue] = [1, 3, 5].map((offset) => {
    const channel = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(first, second) {
  const [lighter, darker] = [relativeLuminance(first), relativeLuminance(second)].sort(
    (a, b) => b - a,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Each colour of the sibling group palette, a `--color-sibling-*` token: its link and its mark on
 * the board, and the quantity on its tab.
 */
function siblingPairs(tokens) {
  return [...tokens.keys()]
    .filter((name) => name.startsWith('sibling-'))
    .flatMap((sibling) => [
      { front: sibling, back: 'background', minimum: TEXT_MINIMUM },
      { front: 'panel', back: sibling, minimum: TEXT_MINIMUM },
    ]);
}

function contrastProblems(tokens) {
  return [...PAIRS, ...siblingPairs(tokens)].flatMap(({ front, back, minimum }) => {
    const [frontColour, backColour] = [tokens.get(front), tokens.get(back)];
    if (!frontColour || !backColour) return [`no --color-${front} or --color-${back}`];
    const ratio = contrastRatio(frontColour, backColour);
    return ratio < minimum
      ? [`${front} on ${back} is ${ratio.toFixed(2)}:1, needs ${minimum}:1`]
      : [];
  });
}

/** Each colour token set anywhere but `@theme`: a class or a media query switching to a second theme. */
function secondThemeProblems(themeCss, themeBlock) {
  const outsideTheme = themeCss.replace(themeBlock, '');
  return [...outsideTheme.matchAll(/(--color-[\w-]+)\s*:/g)].map(
    ([, token]) => `${token} is set outside @theme: a second theme (ADR 0020)`,
  );
}

function lightThemeProblems(tokens) {
  const [background, foreground] = [tokens.get('background'), tokens.get('foreground')];
  if (!background || !foreground) return [];
  return relativeLuminance(background) > relativeLuminance(foreground)
    ? ['the theme is light: background is lighter than foreground (ADR 0020)']
    : [];
}

/** How many colours the card grid cycles its sibling groups through, as the web code says. */
function siblingPaletteSize(palettePath) {
  const size = readFileSync(palettePath, 'utf8').match(/SIBLING_PALETTE_SIZE = (\d+)/)?.[1];
  if (!size) throw new Error(`${basename(palettePath)} has no SIBLING_PALETTE_SIZE`);
  return Number(size);
}

/** The theme must define `--color-sibling-1` up to the palette's size, and no more. */
function paletteProblems(tokens, size) {
  const expected = Array.from({ length: size }, (_, index) => `sibling-${index + 1}`);
  const defined = [...tokens.keys()].filter((name) => name.startsWith('sibling-'));
  return [
    ...expected
      .filter((name) => !tokens.has(name))
      .map((name) => `no --color-${name} for the palette of ${size}`),
    ...defined
      .filter((name) => !expected.includes(name))
      .map((name) => `--color-${name} is beyond the palette of ${size}`),
  ];
}

/** Each font family the theme names first in a `--font-*` token must come from @fontsource. */
function fontProblems(themeCss, themeBlock) {
  return [...themeBlock.matchAll(/--font-[\w-]+:\s*'([^']+)'/g)].flatMap(([, family]) => {
    const fontPackage = `@fontsource-variable/${family
      .replace(/ Variable$/, '')
      .toLowerCase()
      .replaceAll(' ', '-')}`;
    return themeCss.includes(`@import '${fontPackage}';`)
      ? []
      : [`'${family}' is not bundled: no @import '${fontPackage}' in theme.css`];
  });
}

function outsideServiceProblems(path, text) {
  return [...text.matchAll(/https?:\/\/[^\s'")/]+/g)].map(
    ([origin]) => `${basename(path)} asks an outside service: ${origin}`,
  );
}

export function themeProblems(themePath, pagePath, palettePath) {
  const themeCss = readFileSync(themePath, 'utf8');
  const themeBlock = ruleBody(themeCss, '@theme static {');
  const tokens = colourTokens(themeBlock);
  return [
    ...secondThemeProblems(themeCss, themeBlock),
    ...lightThemeProblems(tokens),
    ...contrastProblems(tokens),
    ...paletteProblems(tokens, siblingPaletteSize(palettePath)),
    ...fontProblems(themeCss, themeBlock),
    ...outsideServiceProblems(themePath, themeCss),
    ...outsideServiceProblems(pagePath, readFileSync(pagePath, 'utf8')),
  ];
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [
    themePath = 'packages/web/src/theme.css',
    pagePath = 'packages/web/index.html',
    palettePath = 'packages/web/src/workspace/card-grid/sibling-group-colours.ts',
  ] = process.argv.slice(2);
  const problems = themeProblems(themePath, pagePath, palettePath);
  if (problems.length > 0) {
    console.error(
      ['check-theme: the web theme fails its checks.', ...problems.map((p) => `  ${p}`)].join('\n'),
    );
    process.exit(1);
  }
}
