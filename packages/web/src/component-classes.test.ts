import { describe, expect, it } from 'vitest';
import { HARD_SHADOW, PRIMARY_BUTTON, SECONDARY_BUTTON, SYMBOL_BUTTON } from './ui/board-styles.ts';

/** The source of every component and of the class constants they share, by its path. */
const componentSources = import.meta.glob<string>(['./**/*.{ts,tsx}', '!./**/*.test.{ts,tsx}'], {
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
  it('never mark the keyboard focus with the selection accent', () => {
    expect(componentsWithClass(/\b[\w-]*focus[\w-]*(?:\/[\w-]+)?:[\w-]*accent\b/g)).toEqual({});
  });

  it('leave the hand cursor to the theme', () => {
    expect(componentsWithClass(/\bcursor-pointer\b/g)).toEqual({});
  });

  it('leave the pressed shift to the shared button classes', () => {
    const { './ui/board-styles.ts': sharedClasses, ...elsewhere } = componentsWithClass(
      /\bactive:translate-[xy]-[\w.]+/g,
    );

    expect(sharedClasses).toBeDefined();
    expect(elsewhere).toEqual({});
  });
});

describe('the shared button classes', () => {
  it.each([
    ['primary', PRIMARY_BUTTON],
    ['secondary', SECONDARY_BUTTON],
    ['symbol', SYMBOL_BUTTON],
  ])('sink the %s button by 2 px when pressed, unless it is disabled', (_, buttonClass) => {
    expect(buttonClass).toContain('not-disabled:active:translate-x-0.5');
    expect(buttonClass).toContain('not-disabled:active:translate-y-0.5');
  });

  it('sink the primary button into its hard shadow, its far edge kept in place', () => {
    expect(PRIMARY_BUTTON).toContain(HARD_SHADOW);
    expect(PRIMARY_BUTTON).toContain('not-disabled:active:shadow-[2px_2px_0_var(--color-border)]');
  });
});
