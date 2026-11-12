import { describe, expect, it } from 'vitest';
import indexHtml from '../index.html?raw';
import themeCss from './theme.css?raw';

const REMOTE_URL = /https?:\/\//;

describe('the fonts of the theme', () => {
  it.each([
    ['Space Grotesk Variable', '@fontsource-variable/space-grotesk'],
    ['JetBrains Mono Variable', '@fontsource-variable/jetbrains-mono'],
  ])('bundle %s with the app, from %s', (family, fontPackage) => {
    expect(themeCss).toContain(`'${family}'`);
    expect(themeCss).toContain(`@import '${fontPackage}';`);
  });

  it('asks no outside service for a stylesheet or a font', () => {
    expect(themeCss).not.toMatch(REMOTE_URL);
    expect(indexHtml).not.toMatch(REMOTE_URL);
  });
});
