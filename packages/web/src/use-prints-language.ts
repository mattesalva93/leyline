import { LANGS, type Lang, type PrintCountsByLang } from '@mtg-suite/core';
import { useState } from 'react';

/**
 * The language whose prints the print picker shows: `openingLang` until the user switches it,
 * and `openingLang` again whenever that changes. A language the card has no printable print in
 * gives way to one it has, once `printCounts` tell.
 */
export function usePrintsLanguage(
  openingLang: Lang,
  printCounts: PrintCountsByLang | null,
): readonly [Lang, (lang: Lang) => void] {
  const [printsLang, setPrintsLang] = useState(openingLang);
  const [followedOpeningLang, setFollowedOpeningLang] = useState(openingLang);
  if (followedOpeningLang !== openingLang) {
    setFollowedOpeningLang(openingLang);
    setPrintsLang(openingLang);
  }
  return [languageWithPrints(printsLang, printCounts), setPrintsLang];
}

/** `lang`, unless the counts say it has no print and another language has some. */
function languageWithPrints(lang: Lang, printCounts: PrintCountsByLang | null): Lang {
  if (printCounts?.[lang] !== 0) return lang;
  return LANGS.find((other) => printCounts[other] > 0) ?? lang;
}
