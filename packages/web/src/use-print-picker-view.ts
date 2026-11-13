import { LANGS, type Lang, type Print, type PrintCountsByLang } from '@mtg-suite/core';
import { useCallback, useState } from 'react';

/** Where the print picker stands, and how the user moves it. */
export interface PrintPickerView {
  /** The language whose prints the picker shows. */
  readonly printsLang: Lang;
  /** Shows the prints of `lang`, as the user asked: no print is brought into view any more. */
  readonly changePrintsLang: (lang: Lang) => void;
  /** The id of the print to bring into view and focus once it loads; `null` when none waits. */
  readonly printToShow: string | null;
  /** Called once the print to show is in view, or turned out not to be among the prints. */
  readonly onPrintShown: () => void;
}

/**
 * The print picker opened on `openingPrint`, the print of the tile the user picked: its language,
 * with that print to bring into view; again each time the user picks another tile. With no such
 * print it opens on `fallbackLang`. A language the card has no printable print in gives way to
 * one it has, once `printCounts` tell.
 */
export function usePrintPickerView(
  openingPrint: Print | null,
  fallbackLang: Lang,
  printCounts: PrintCountsByLang | null,
): PrintPickerView {
  const openingLang = openingPrint?.lang ?? fallbackLang;
  const openingPrintId = openingPrint?.id ?? null;
  const [printsLang, setPrintsLang] = useState(openingLang);
  const [printToShow, setPrintToShow] = useState(openingPrintId);
  const [followed, setFollowed] = useState({ lang: openingLang, printId: openingPrintId });
  if (followed.lang !== openingLang || followed.printId !== openingPrintId) {
    setFollowed({ lang: openingLang, printId: openingPrintId });
    setPrintsLang(openingLang);
    setPrintToShow(openingPrintId);
  }
  const changePrintsLang = useCallback((lang: Lang) => {
    setPrintsLang(lang);
    setPrintToShow(null);
  }, []);
  const onPrintShown = useCallback(() => setPrintToShow(null), []);
  return {
    printsLang: languageWithPrints(printsLang, printCounts),
    changePrintsLang,
    printToShow,
    onPrintShown,
  };
}

/** `lang`, unless the counts say it has no print and another language has some. */
function languageWithPrints(lang: Lang, printCounts: PrintCountsByLang | null): Lang {
  if (printCounts?.[lang] !== 0) return lang;
  return LANGS.find((other) => printCounts[other] > 0) ?? lang;
}
