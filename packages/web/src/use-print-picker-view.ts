import {
  copiesByPrint,
  langWithPrints,
  type Lang,
  type Print,
  type PrintCountsByLang,
  type ResolvedLine,
} from '@mtg-suite/core';
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
 * The print picker opened on `tilePrint`, the print of the tile the user picked: its language,
 * with that print to bring into view; again each time the user picks another tile of `line`.
 * A tile that took the selection because the selected one lost its last copy moves nothing: the
 * user is still at work where they were. With no tile print it opens on the line's language. A
 * language the card has no printable print in gives way to
 * one it has, once `printCounts` tell.
 */
export function usePrintPickerView(
  tilePrint: Print | null,
  line: ResolvedLine,
  printCounts: PrintCountsByLang | null,
): PrintPickerView {
  const tileLang = tilePrint?.lang ?? line.lang;
  const tilePrintId = tilePrint?.id ?? null;
  const [printsLang, setPrintsLang] = useState(tileLang);
  const [printToShow, setPrintToShow] = useState(tilePrintId);
  const [lastTilePrint, setLastTilePrint] = useState({ lang: tileLang, printId: tilePrintId });
  if (lastTilePrint.lang !== tileLang || lastTilePrint.printId !== tilePrintId) {
    setLastTilePrint({ lang: tileLang, printId: tilePrintId });
    const lastPrintId = lastTilePrint.printId;
    const lastTileKeepsCopies =
      lastPrintId === null || copiesByPrint(line).some(({ print }) => print.id === lastPrintId);
    if (lastTileKeepsCopies) {
      setPrintsLang(tileLang);
      setPrintToShow(tilePrintId);
    }
  }
  const changePrintsLang = useCallback((lang: Lang) => {
    setPrintsLang(lang);
    setPrintToShow(null);
  }, []);
  const onPrintShown = useCallback(() => setPrintToShow(null), []);
  return {
    printsLang: printCounts ? langWithPrints(printsLang, printCounts) : printsLang,
    changePrintsLang,
    printToShow,
    onPrintShown,
  };
}
