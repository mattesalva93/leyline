import { useEffect, useLayoutEffect, useState } from 'react';
import { loadThemeChoice, saveThemeChoice, type Theme } from './theme-choice.ts';

const SYSTEM_DARK_QUERY = '(prefers-color-scheme: dark)';

function systemTheme(): Theme {
  return window.matchMedia(SYSTEM_DARK_QUERY).matches ? 'dark' : 'light';
}

/** The system's theme, kept up to date while the page is open. */
function useSystemTheme(): Theme {
  const [theme, setTheme] = useState(systemTheme);
  useEffect(() => {
    const media = window.matchMedia(SYSTEM_DARK_QUERY);
    const update = () => setTheme(media.matches ? 'dark' : 'light');
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return theme;
}

/**
 * The page's theme: the system's until the user flips the switch, then the one they picked,
 * remembered on the device. It is applied as the `dark` class of the root element, which the
 * Tailwind theme reads.
 */
export function useTheme(): { readonly theme: Theme; readonly switchTheme: () => void } {
  const systemThemeNow = useSystemTheme();
  const [pickedTheme, setPickedTheme] = useState(loadThemeChoice);
  const theme = pickedTheme ?? systemThemeNow;

  // Before the browser paints, so switching theme never shows one frame in the old colours.
  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  function switchTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setPickedTheme(next);
    saveThemeChoice(next);
  }

  return { theme, switchTheme };
}
