// Domain types. Names follow GLOSSARY.md.

/** Card languages: the catalog holds English and Italian prints (ADR 0002). */
export const LANGS = ['it', 'en'] as const;
export type Lang = (typeof LANGS)[number];

export function isLang(value: unknown): value is Lang {
  return LANGS.some((lang) => lang === value);
}

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
  /** The name printed on the card, in `lang`; multi-face prints use "Front // Back". */
  readonly printedName: string;
  /** ISO date, `YYYY-MM-DD`. */
  readonly releasedAt: string;
  readonly imageStatus: ImageStatus;
  readonly digital: boolean;
  readonly oversized: boolean;
  /** Scryfall `layout`, e.g. `normal`, `transform`, `art_series`, `token`. */
  readonly layout: string;
  /** Scryfall `set_type`, e.g. `expansion`, `token`, `playtest`. */
  readonly setType: string;
  /** Scryfall `promo_types`, e.g. `playtest` for Mystery Booster playtest cards. */
  readonly promoTypes: readonly string[];
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
   * Returns, for each of `names` (already normalised with `nameKey`), at least every card that
   * has a name key (see `cardKeys`) equal to it, with all its prints; when no card has, at
   * least every card with a name key whose trigram similarity to it reaches `minSimilarity`.
   * Extra cards are allowed: `core` does the final match.
   */
  findByNames(
    names: readonly string[],
    options: { readonly minSimilarity: number },
  ): Promise<readonly CatalogEntry[]>;
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

/** Why a line's default print needs the user's attention. */
export type PrintWarning = 'lowResolution' | 'languageFallback';

/** A card a line means or could mean, with the print it defaults to. */
export interface Candidate {
  readonly card: Card;
  /** `null` when the card has no printable print, in the line language or in English. */
  readonly defaultPrint: Print | null;
  /** `null` when the default print is fine as it is. */
  readonly printWarning: PrintWarning | null;
}

export interface ResolvedLine extends DecklistLineBase, Candidate {
  readonly status: 'resolved';
  readonly allocations: readonly Allocation[];
}

export interface AmbiguousLine extends DecklistLineBase {
  readonly status: 'ambiguous';
  /** Best match first. */
  readonly candidates: readonly Candidate[];
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
