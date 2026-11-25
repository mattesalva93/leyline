import type { Lang, PageFormat } from '@leyline/core';

/**
 * What the app records of the product path (ADR 0027): counts and choices, never what the user
 * wrote, so no decklist text and no card name.
 */
export type ProductEvent =
  | {
      /** A pasted or loaded decklist, once every line of it is resolved. */
      readonly name: 'decklist_resolved';
      readonly lineCount: number;
      readonly unrecognisedLineCount: number;
      readonly lang: Lang;
    }
  | {
      /** A PDF, once it is ready. */
      readonly name: 'pdf_generated';
      readonly pageFormat: PageFormat;
      readonly pageCount: number;
      readonly cardCount: number;
    };
