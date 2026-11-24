import { isLang, type Lang } from '@leyline/core';

const STORAGE_KEY = 'leyline.defaultLang';
/** Italian players are who the app is for (spec #1): their cards start in Italian. */
const FIRST_RUN_LANG: Lang = 'it';

/** The card language the user picked last time, or Italian on a first visit. */
export function loadDefaultLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isLang(stored) ? stored : FIRST_RUN_LANG;
  } catch {
    // Storage can be blocked (private windows, site data off): the app still works.
    return FIRST_RUN_LANG;
  }
}

export function saveDefaultLang(lang: Lang): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Not remembered across visits; nothing else depends on it.
  }
}
