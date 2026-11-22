import { describe, expect, it } from 'vitest';

/** The source of every component, by its path. */
const componentSources = import.meta.glob<string>(['./**/*.tsx', '!./**/*.test.tsx'], {
  query: '?raw',
  import: 'default',
  eager: true,
});

/** The components whose source holds a class matching `pattern`, with the classes it matched. */
function componentsWithClass(pattern: RegExp): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(componentSources)
      .map(
        ([path, source]) => [path, [...source.matchAll(pattern)].map(([match]) => match)] as const,
      )
      .filter(([, matches]) => matches.length > 0),
  );
}

describe('the classes of the components', () => {
  it('leave the hand cursor to the theme', () => {
    expect(componentsWithClass(/\bcursor-pointer\b/g)).toEqual({});
  });
});
