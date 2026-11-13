export const THEMES = ['light', 'dark'] as const;

export type Theme = (typeof THEMES)[number];

const STORAGE_KEY = 'mtg-suite.theme';

function isTheme(value: unknown): value is Theme {
  return THEMES.some((theme) => theme === value);
}

/** The theme the user picked with the switch on this device, or `null` if they never did. */
export function loadThemeChoice(): Theme | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isTheme(stored) ? stored : null;
  } catch {
    // Storage can be blocked (private windows, site data off): the system theme applies.
    return null;
  }
}

export function saveThemeChoice(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Not remembered across visits; the switch still works for this one.
  }
}
