import type { Lang } from '@mtg-suite/core';
import { useState } from 'react';

/**
 * The language whose prints the print picker shows: the line's own until the user switches it,
 * and the line's again whenever the line changes language.
 */
export function usePrintsLanguage(lineLang: Lang): readonly [Lang, (lang: Lang) => void] {
  const [printsLang, setPrintsLang] = useState(lineLang);
  const [followedLineLang, setFollowedLineLang] = useState(lineLang);
  if (followedLineLang !== lineLang) {
    setFollowedLineLang(lineLang);
    setPrintsLang(lineLang);
  }
  return [printsLang, setPrintsLang];
}
