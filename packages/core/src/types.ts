// Domain types. Names follow GLOSSARY.md.

/** Card language. Only English is imported for now (ADR 0002 adds Italian later). */
export type Lang = 'en';

/** Scryfall's `image_status`. */
export type ImageStatus = 'highres_scan' | 'lowres' | 'placeholder' | 'missing';

/** The abstract card, identified by Scryfall's oracle id. */
export interface Card {
  readonly oracleId: string;
  /** Canonical English name; double-faced cards use "Front // Back". */
  readonly name: string;
}

export interface ImageUris {
  readonly small: string;
  readonly normal: string;
  readonly large: string;
}

/** One printed face. Single-faced prints have one, double-faced prints two. */
export interface PrintFace {
  readonly name: string;
  readonly imageUris: ImageUris;
}

/** One specific printing of a `Card`. */
export interface Print {
  /** Scryfall print id. */
  readonly id: string;
  readonly set: string;
  readonly collectorNumber: string;
  readonly lang: Lang;
  /** ISO date, `YYYY-MM-DD`. */
  readonly releasedAt: string;
  readonly imageStatus: ImageStatus;
  readonly digital: boolean;
  readonly oversized: boolean;
  /** Scryfall `layout`, e.g. `normal`, `transform`, `art_series`, `token`. */
  readonly layout: string;
  /** Scryfall `set_type`, e.g. `expansion`, `token`, `playtest`. */
  readonly setType: string;
  readonly faces: readonly PrintFace[];
}

/** A card with the prints the catalog holds for it. */
export interface CatalogEntry {
  readonly card: Card;
  readonly prints: readonly Print[];
}

/** How `core` queries cards and prints. `api` implements it on PostgreSQL. */
export interface Catalog {
  /**
   * Returns at least every card whose full name or front-face name, lowercased and with single
   * spaces, equals one of `names` (already normalised that way), with all its prints. Extra
   * cards are allowed: `core` does the final match.
   */
  findByNames(names: readonly string[]): Promise<readonly CatalogEntry[]>;
}

/** A (`Print`, quantity) pair inside a `DecklistLine`. */
export interface Allocation {
  readonly print: Print;
  readonly quantity: number;
}

interface DecklistLineBase {
  /** The line as the user wrote it. */
  readonly text: string;
  readonly quantity: number;
  readonly lang: Lang;
}

export interface ResolvedLine extends DecklistLineBase {
  readonly status: 'resolved';
  readonly card: Card;
  /** `null` when the card has no printable print in the line language. */
  readonly defaultPrint: Print | null;
  readonly allocations: readonly Allocation[];
}

export interface AmbiguousLine extends DecklistLineBase {
  readonly status: 'ambiguous';
  readonly candidates: readonly Card[];
}

export interface NotFoundLine extends DecklistLineBase {
  readonly status: 'notFound';
}

/** One entry of a decklist. */
export type DecklistLine = ResolvedLine | AmbiguousLine | NotFoundLine;

/** Layout options of a `Sheet`. Margins, spacing and crop marks come later. */
export interface SheetOptions {
  readonly pageFormat: 'A4';
  /** Which Scryfall image goes in the PDF: JPG "large" (ADR 0001). */
  readonly imageQuality: 'large';
}

/** Layout options plus the lines to print. */
export interface Sheet {
  readonly options: SheetOptions;
  readonly lines: readonly DecklistLine[];
}
