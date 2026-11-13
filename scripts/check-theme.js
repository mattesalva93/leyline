// Checks the web theme, the one home of the design tokens (ADR 0010): every colour pair meets
// WCAG 2.2 AA in the light and the dark theme, and fonts and stylesheets come from the app itself.
// Usage: node scripts/check-theme.js [theme.css] [index.html]
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

function contrastProblems(themeName, tokens) {
  return PAIRS.flatMap(({ front, back, minimum }) => {
    const [frontColour, backColour] = [tokens.get(front), tokens.get(back)];
    if (!frontColour || !backColour)
      return [`${themeName} theme: no --color-${front} or --color-${back}`];
    const ratio = contrastRatio(frontColour, backColour);
    return ratio < minimum
      ? [`${themeName} theme: ${front} on ${back} is ${ratio.toFixed(2)}:1, needs ${minimum}:1`]
      : [];
  });
}

/** Each font family the theme names first in a `--font-*` token must come from @fontsource. */
function fontProblems(themeCss, lightBlock) {
  return [...lightBlock.matchAll(/--font-[\w-]+:\s*'([^']+)'/g)].flatMap(([, family]) => {
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

export function themeProblems(themePath, pagePath) {
  const themeCss = readFileSync(themePath, 'utf8');
  const lightBlock = ruleBody(themeCss, '@theme static {');
  const lightTokens = colourTokens(lightBlock);
  const darkTokens = new Map([...lightTokens, ...colourTokens(ruleBody(themeCss, '.dark {'))]);
  return [
    ...contrastProblems('light', lightTokens),
    ...contrastProblems('dark', darkTokens),
    ...fontProblems(themeCss, lightBlock),
    ...outsideServiceProblems(themePath, themeCss),
    ...outsideServiceProblems(pagePath, readFileSync(pagePath, 'utf8')),
  ];
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [themePath = 'packages/web/src/theme.css', pagePath = 'packages/web/index.html'] =
    process.argv.slice(2);
  const problems = themeProblems(themePath, pagePath);
  if (problems.length > 0) {
    console.error(
      ['check-theme: the web theme fails its checks.', ...problems.map((p) => `  ${p}`)].join('\n'),
    );
    process.exit(1);
  }
}
