import type { Print, PrintFace } from './types.ts';

/**
 * The faces of `print` that go on the sheet, one card each: all of them, but only the front of
 * an art series card. Its back tells set, number and artist, no card to play, and Scryfall often
 * has only a stand-in picture for it (ADR 0014).
 */
export function printedFaces(print: Print): readonly PrintFace[] {
  return print.layout === 'art_series' ? print.faces.slice(0, 1) : print.faces;
}

/** The face printed on the back of `print`'s card, if it has one there: what turning it shows. */
export function printedBackFace(print: Print): PrintFace | undefined {
  return printedFaces(print)[1];
}
