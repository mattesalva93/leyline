// Domain types. Names follow GLOSSARY.md.

/** Card languages: the catalog holds English and Italian prints (ADR 0002). */
export const LANGS = ['it', 'en'] as const;
export type Lang = (typeof LANGS)[number];

export function isLang(value: unknown): value is Lang {
  return LANGS.some((lang) => lang === value);
}

/** Scryfall's `image_status` values. */
export const IMAGE_STATUSES = ['highres_scan', 'lowres', 'placeholder', 'missing'] as const;
export type ImageStatus = (typeof IMAGE_STATUSES)[number];

/** The abstract card, identified by Scryfall's oracle id. */
export interface Card {
  readonly oracleId: string;
  /** Canonical English name; double-faced cards use "Front // Back". */
  readonly name: string;
  /**
   * The power and toughness of each face of the card in the rules (Scryfall `card_faces`), in
   * face order; `null` on a face without them (an artifact, an emblem, the spell of an
   * adventure). These are not the images of a print: an adventure has two faces and one image, a
   * reversible card one face and two images, so never pair it with `Print.faces` by index (ADR
   * 0015).
   */
  readonly powerToughnessByFace: readonly (PowerToughness | null)[];
  /** Scryfall `keywords`: the card's keyword abilities, in English, in Scryfall's order. */
  readonly keywords: readonly string[];
}

/** A face's power and toughness as Scryfall writes them: text, since some read `*` or `1+*`. */
export interface PowerToughness {
  readonly power: string;
  readonly toughness: string;
}

export interface ImageUris {
  readonly small: string;
  readonly normal: string;
  readonly large: string;
  /** The largest image, with transparent corners: what the "maximum quality" sheet prints. */
  readonly png: string;
}

/** One printed face. Single-faced prints have one, double-faced prints two. */
export interface PrintFace {
  readonly name: string;
  /** Who drew this face's art; empty when the catalog does not know. */
  readonly artist: string;
  readonly imageUris: ImageUris;
}

/** One specific printing of a `Card`. */
export interface Print {
  /** Scryfall print id. */
  readonly id: string;
  readonly set: string;
  /** The English name of the set, e.g. `Modern Horizons 2`; empty when the catalog does not know. */
  readonly setName: string;
  readonly collectorNumber: string;
  readonly lang: Lang;
  /** The name printed on the card, in `lang`; multi-face prints use "Front // Back". */
  readonly printedName: string;
  /** Scryfall `flavor_name`; multi-face prints use "Front // Back". `null` when it has none. */
  readonly flavorName: string | null;
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
  /**
   * The cards, with all their prints, a name search for `key` (already normalised with
   * `nameKey`) finds: those with a name key equal to it, then those with one that starts with
   * it, then those with one whose trigram similarity to it reaches `minSimilarity`. Within each
   * group the most similar name key comes first, then the card name in alphabetical order; at
   * most `limit` cards.
   */
  searchByName(
    key: string,
    options: { readonly minSimilarity: number; readonly limit: number },
  ): Promise<readonly CatalogEntry[]>;
  /** The card with oracle id `oracleId` and all its prints, or `null` when there is none. */
  findCard(oracleId: string): Promise<CatalogEntry | null>;
  /**
   * The tokens each of `printIds` creates: the token prints its Scryfall `all_parts` names as
   * tokens, in that order, each with its card and all that card's prints. Scryfall lists parts
   * on English prints only: a print of another language takes those of the English print with
   * its set and number. Token prints the catalog does not hold are left out.
   */
  findTokensCreatedBy(printIds: readonly string[]): Promise<readonly CreatedToken[]>;
}

/** A print and a token print its Scryfall `all_parts` names as a token it creates. */
export interface TokenLink {
  readonly creatorPrintId: string;
  readonly tokenPrintId: string;
}

/** A `TokenLink` with the token's card and all its prints. */
export interface CreatedToken extends TokenLink {
  readonly token: CatalogEntry;
}

/** One page of the prints a card can print with, as the print picker shows them. */
export interface PrintPage {
  readonly prints: readonly Print[];
  /** How many prints all the pages hold together. */
  readonly total: number;
  /** Asks for the next page; `null` on the last one. */
  readonly nextCursor: string | null;
}

/** A (`Print`, quantity) pair inside a `DecklistLine`. */
export interface Allocation {
  readonly print: Print;
  readonly quantity: number;
}

/**
 * The copies the user allocated to prints on a line of the card `oracleId`, least recently
 * changed first.
 */
export interface AllocationChoice {
  readonly oracleId: string;
  readonly allocations: readonly Allocation[];
}

interface DecklistLineBase {
  /** The line as the user wrote it. */
  readonly text: string;
  readonly quantity: number;
  readonly lang: Lang;
}

/**
 * Why the prints a line's copies use need the user's attention: a low-resolution image, which an
 * English print could replace (`lowResolution`) or not (`lowResolutionWithoutEnglish`), or no
 * print with a real image in the line's language, so English stands in (`languageFallback`).
 */
export type PrintWarning = 'lowResolution' | 'lowResolutionWithoutEnglish' | 'languageFallback';

/** A card a line means or could mean, with the print it defaults to. */
export interface Candidate {
  readonly card: Card;
  /** `null` when the card has no printable print, in the line language or in English. */
  readonly defaultPrint: Print | null;
  /** `null` when the default print is fine as it is. */
  readonly printWarning: PrintWarning | null;
}

/** A card a name search found. */
export interface FoundCard extends Candidate {
  /**
   * How many cards `listCardsNamed` lists for the name of its front face. A found card missing
   * from that list, such as an art series card the card it is named after outranks, is not
   * counted.
   */
  readonly sameNamedCardCount: number;
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

/** A site that hosts decks, whose deck links get instructions of their own. */
export type DeckSite = 'moxfield' | 'archidekt';

/** A deck link: never looked up in the catalog, never printed. */
export interface DeckLinkLine extends DecklistLineBase {
  readonly status: 'deckLink';
  /** `null` when the link is to a site of no known `DeckSite`. */
  readonly site: DeckSite | null;
}

/** One entry of a decklist. */
export type DecklistLine = ResolvedLine | AmbiguousLine | NotFoundLine | DeckLinkLine;

/** A resolved line as a token suggestion reads it: its card, and the print it shows. */
export interface TokenQueryLine {
  readonly oracleId: string;
  /** The print the line's preview shows (`previewPrint`); `null` when it has none. */
  readonly previewPrintId: string | null;
}

/**
 * A token the cards of the decklist create, offered to the user to add to the Tokens section,
 * with the print a line of it would be written with.
 */
export interface SuggestedToken {
  readonly candidate: Candidate & { readonly defaultPrint: Print };
  /** The language a line written with `candidate`'s default print resolves in. */
  readonly lang: Lang;
  /** Where the lines creating the token sit among the `TokenQueryLine`s asked, in their order. */
  readonly createdBy: readonly number[];
}

/** The `DecklistSection`s a decklist can have, in the order the card grid shows them. */
export const DECKLIST_SECTIONS = ['commander', 'mainDeck', 'lands', 'sideboard', 'tokens'] as const;

/** The part of the decklist a written line belongs to, such as the main deck or the sideboard. */
export type DecklistSection = (typeof DECKLIST_SECTIONS)[number];

/** Which Scryfall image a `Sheet` prints: the JPG "large" one, or the PNG. */
export type ImageQuality = 'large' | 'png';

/** The paper size a `Sheet` prints on. */
export type PageFormat = 'A4' | 'Letter';

/** Layout options of a `Sheet`. */
export interface SheetOptions {
  readonly pageFormat: PageFormat;
  /** Which Scryfall image goes in the PDF: JPG "large", or the heavier PNG (ADR 0001). */
  readonly imageQuality: ImageQuality;
  /** The least white paper left between the page edge and anything printed. */
  readonly marginMm: number;
  /** The paper left between two neighbouring cards. */
  readonly spacingMm: number;
  /** Whether crop marks are drawn around the grid. */
  readonly cropMarks: boolean;
}

/** Layout options plus the lines to print. */
export interface Sheet {
  readonly options: SheetOptions;
  readonly lines: readonly DecklistLine[];
}

/** A rectangle on the page, in mm from its top-left corner. */
export interface BoxMm {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** A `Slot` where the layout puts it: the card-sized box and the face whose image fills it. */
export interface PlacedSlot {
  readonly box: BoxMm;
  readonly face: PrintFace;
}

/** Where everything of a `Sheet` goes on paper: what the PDF draws and the preview shows. */
export interface SheetLayout {
  /** The size of every page, in mm. */
  readonly pageMm: { readonly width: number; readonly height: number };
  readonly columns: number;
  readonly rows: number;
  /** The placed slots of each page, in reading order; empty cells are left out. */
  readonly pages: readonly (readonly PlacedSlot[])[];
  /** The same on every page, around the grid and between its cards; empty when crop marks are off. */
  readonly cropMarks: readonly CropMark[];
}

/** A point on the page, in mm from its top-left corner. */
export interface PointMm {
  readonly x: number;
  readonly y: number;
}

/** A short straight line on the extension of a card edge, off the cards: where to cut. */
export interface CropMark {
  readonly from: PointMm;
  readonly to: PointMm;
}
