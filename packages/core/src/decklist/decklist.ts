import { copiesByPrint } from '../print/allocation.ts';
import { hasRealImage, qualityWarning } from '../print/default-print.ts';
import { namedCandidate, withoutOutranked } from '../card-search/same-name-preference.ts';
import { deckLinkOf } from './deck-link.ts';
import { SIDEBOARD_PREFIX, sectionOpenedBy } from './decklist-section.ts';
import { LINE_BREAK } from './line-breaks.ts';
import { MIN_SIMILARITY, cardKeys, nameKey, trigramSimilarity, trigrams } from '../name-match.ts';
import type {
  AmbiguousLine,
  Candidate,
  Catalog,
  CatalogEntry,
  DeckSite,
  DecklistLine,
  Lang,
  Print,
  ResolvedLine,
} from '../types.ts';

/**
 * How far below the closest card another one may score and still be suggested with it. A real
 * typo leads its runner-up by far more; a bare shared word ("lightning") does not.
 */
const SUGGESTION_MARGIN = 0.1;

export interface ResolveOptions {
  /** Today's date (ISO, `YYYY-MM-DD`): prints released later are not default candidates. */
  readonly today: string;
  /** The language lines ask for, unless the print they name is in another one. */
  readonly lang: Lang;
}

/** The print an Arena or MTGO line names: Scryfall set code and collector number, lowercase. */
export interface PrintRef {
  readonly set: string;
  readonly collectorNumber: string;
}

interface ParsedLineBase {
  readonly text: string;
  readonly quantity: number;
}

/** A line that asks for a card by its name, maybe naming its print too. */
export interface ParsedCardLine extends ParsedLineBase {
  readonly kind: 'card';
  readonly name: string;
  readonly printRef: PrintRef | null;
}

/** A line that is a deck link, maybe after a quantity. */
interface ParsedDeckLink extends ParsedLineBase {
  readonly kind: 'deckLink';
  readonly site: DeckSite | null;
}

export type ParsedLine = ParsedCardLine | ParsedDeckLink;

const QUANTITY_NAME = /^(\d+)x?\s+(.+)$/i;
/** "Sol Ring (C21) 263", maybe with a finish marker such as "*F*" (foil) after the number. */
const NAME_SET_NUMBER = /^(.+?)\s+\(([A-Za-z0-9]+)\)\s+(\S+)(?:\s+\*[A-Za-z]+\*)?$/;
/**
 * What an Archidekt Text export ends a line with: its categories (" [Ramp,Draw{top}]") and its
 * color tag (" ^Buy,#0066ff^"). No card name holds "[", "]" or "^".
 */
const ARCHIDEKT_TAIL = /(?:\s+(?:\[[^\]]*\]|\^[^^]*\^))+$/;
const COMMENT = /^(\/\/|#)/;

function isIgnored(trimmed: string): boolean {
  return trimmed === '' || COMMENT.test(trimmed) || sectionOpenedBy(trimmed) !== null;
}

/**
 * The card a line asks for, or the deck it links to; `null` for blank lines, comments and
 * section headers. The sideboard prefix marks a card: a header is a line of its own, so a
 * prefixed one is a card name.
 */
export function parseLine(text: string): ParsedLine | null {
  const written = text.trim();
  const trimmed = written.replace(SIDEBOARD_PREFIX, '');
  if (isIgnored(written) || trimmed === '') return null;
  const quantityMatch = QUANTITY_NAME.exec(trimmed);
  const quantity = quantityMatch?.[1] ? Number(quantityMatch[1]) : 1;
  const rest = quantityMatch?.[2] ?? trimmed;
  const deckLink = deckLinkOf(rest);
  if (deckLink) return { kind: 'deckLink', text, quantity, site: deckLink.site };
  const card = rest.replace(ARCHIDEKT_TAIL, '');
  const [, name, set, collectorNumber] = NAME_SET_NUMBER.exec(card) ?? [];
  if (!name || !set || !collectorNumber) {
    return { kind: 'card', text, quantity, name: card, printRef: null };
  }
  return {
    kind: 'card',
    text,
    quantity,
    name,
    printRef: { set: set.toLowerCase(), collectorNumber: collectorNumber.toLowerCase() },
  };
}

/**
 * Whether a written line stands for a line of the decklist, a card or a deck link: it is no
 * blank line, comment or section header.
 */
export function namesACard(writtenLine: string): boolean {
  return parseLine(writtenLine) !== null;
}

/**
 * Parses a decklist ("quantity name" lines, or just a name for one copy, maybe followed by set
 * and collector number as Arena and MTGO export them; blank lines, comments and section headers
 * skipped) and resolves each line to a card by its English or printed name, forgiving
 * misspellings. A line naming a print of the card it resolves to uses that print.
 */
export async function resolveDecklist(
  text: string,
  catalog: Catalog,
  options: ResolveOptions,
): Promise<DecklistLine[]> {
  const parsed = text.split(LINE_BREAK).flatMap((raw) => parseLine(raw) ?? []);
  const cardLines = parsed.filter((line) => line.kind === 'card');
  const names = [...new Set(cardLines.map((line) => nameKey(line.name)))];
  const entries = await catalog.findByNames(names, { minSimilarity: MIN_SIMILARITY });
  // Keys and trigrams once per entry, not once per line: a decklist has a hundred lines.
  const named = entries.map((entry) => {
    const keys = cardKeys(
      entry.card.name,
      entry.prints.map((print) => print.printedName),
    );
    return { entry, keys, trigrams: keys.map(trigrams) };
  });

  return parsed.map((line) =>
    line.kind === 'deckLink'
      ? {
          text: line.text,
          quantity: line.quantity,
          lang: options.lang,
          status: 'deckLink',
          site: line.site,
        }
      : resolveLine(line, named, options),
  );
}

/** A catalog entry with the name keys it answers to, ready to compare. */
interface NamedEntry {
  readonly entry: CatalogEntry;
  readonly keys: readonly string[];
  readonly trigrams: readonly ReadonlySet<string>[];
}

type LineBase = Pick<DecklistLine, 'text' | 'quantity' | 'lang'>;

export function resolvedLine(base: LineBase, candidate: Candidate): ResolvedLine {
  return { ...base, status: 'resolved', ...candidate, allocations: [] };
}

function resolveLine(
  line: ParsedCardLine,
  named: readonly NamedEntry[],
  { today, lang }: ResolveOptions,
): DecklistLine {
  const base = { text: line.text, quantity: line.quantity, lang };
  const closest = closestCards(nameKey(line.name), named);
  const explicit = line.printRef && namedPrint(closest, line.printRef, base.lang);
  if (explicit) {
    const { lang: explicitLang, ...candidate } = explicit;
    return resolvedLine({ ...base, lang: explicitLang }, candidate);
  }
  const candidates = withoutOutranked(
    closest.map((entry) => namedCandidate(entry, { lang, today })),
  );
  const [match] = candidates;
  if (!match) return { ...base, status: 'notFound' };
  if (candidates.length > 1) return { ...base, status: 'ambiguous', candidates };
  return resolvedLine(base, match);
}

/**
 * The print `ref` names among `entries`' prints, with the language the line takes: `lang` when
 * the print exists in it, the print's own otherwise. When the print in `lang` has no real image,
 * another language's stands in, with a warning.
 */
export function namedPrint(
  entries: readonly CatalogEntry[],
  ref: PrintRef,
  lang: Lang,
): (Candidate & { readonly lang: Lang }) | undefined {
  const found = entries.flatMap((entry) =>
    entry.prints
      .filter(
        (print) =>
          print.set === ref.set && print.collectorNumber.toLowerCase() === ref.collectorNumber,
      )
      .map((print) => ({ card: entry.card, print })),
  );
  const withImage = found.filter((match) => hasRealImage(match.print));
  const match = withImage.find((m) => m.print.lang === lang) ?? withImage[0] ?? found[0];
  if (!match) return undefined;
  const stoodIn = match.print.lang !== lang && found.some((m) => m.print.lang === lang);
  const englishExists = withImage.some((m) => m.print.lang === 'en');
  return {
    card: match.card,
    defaultPrint: match.print,
    lang: stoodIn ? lang : match.print.lang,
    printWarning: stoodIn ? 'languageFallback' : qualityWarning(match.print, englishExists),
  };
}

/** Resolves an ambiguous line to the candidate the user chose, by its card's oracle id. */
export function chooseCandidate(line: AmbiguousLine, oracleId: string): ResolvedLine {
  const candidate = line.candidates.find((c) => c.card.oracleId === oracleId);
  if (!candidate) throw new Error(`Card ${oracleId} is not a candidate of "${line.text}"`);
  return resolvedLine({ text: line.text, quantity: line.quantity, lang: line.lang }, candidate);
}

/**
 * The line with the user's pick applied: an ambiguous line resolves to the card `oracleId`
 * names when it is one of its candidates. The pick is kept apart from the line, so it survives
 * resolving the line again, in another language for one; any other line comes back as it is.
 */
export function applyCandidateChoice(line: DecklistLine, oracleId: string): DecklistLine {
  const isCandidate =
    line.status === 'ambiguous' && line.candidates.some((c) => c.card.oracleId === oracleId);
  return isCandidate ? chooseCandidate(line, oracleId) : line;
}

/** The print a line's preview shows: the one its first copy prints with, if any. */
export function previewPrint(line: DecklistLine): Print | null {
  if (line.status !== 'resolved') return null;
  return copiesByPrint(line)[0]?.print ?? null;
}

/** Cards named exactly `key`; failing that, the cards most similar to it. */
function closestCards(key: string, named: readonly NamedEntry[]): CatalogEntry[] {
  const exact = named.filter(({ keys }) => keys.includes(key)).map(({ entry }) => entry);
  if (exact.length > 0) return exact;
  const keyTrigrams = trigrams(key);
  const scored = named
    .map(({ entry, trigrams: entryTrigrams }) => ({
      entry,
      score: Math.max(...entryTrigrams.map((t) => trigramSimilarity(t, keyTrigrams))),
    }))
    .filter((match) => match.score >= MIN_SIMILARITY)
    .sort((a, b) => b.score - a.score);
  const [best] = scored;
  if (!best) return [];
  return scored
    .filter((match) => match.score >= best.score - SUGGESTION_MARGIN)
    .map((match) => match.entry);
}

/**
 * A written line split around its quantity: what comes before it (indentation, "SB:"), the
 * quantity with its "x" if any (empty when the line names one copy implicitly), and the rest.
 */
const WRITTEN_QUANTITY = /^(\s*(?:SB:\s*)?)(?:(\d+)(x?)\s+)?(.*)$/is;

/** The line with `quantity` copies, its text rewritten to say so, as the user would write it. */
export function setLineQuantity(line: DecklistLine, quantity: number): DecklistLine {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error(`A line prints a whole number of copies, at least one: got ${quantity}`);
  }
  return { ...line, quantity, text: writtenWithQuantity(line.text, quantity) };
}

/** The written line rewritten for `quantity` copies, as the user would write it. */
export function writtenWithQuantity(writtenLine: string, quantity: number): string {
  return writtenFromParts(writtenLine, quantity, writtenLineParts(writtenLine).card);
}

/** A written line split into its quantity, written or implicit, and the card it names after it. */
export function writtenLineParts(writtenLine: string): {
  readonly quantity: number;
  readonly card: string;
} {
  const [, , quantity, , card = ''] = WRITTEN_QUANTITY.exec(writtenLine) ?? [];
  return { quantity: quantity ? Number(quantity) : 1, card };
}

/**
 * The written line with `quantity` copies of `card`, keeping what comes before the quantity
 * (indentation, "SB:") and its "x", as the user would write it.
 */
export function writtenFromParts(writtenLine: string, quantity: number, card: string): string {
  const [, beforeQuantity = '', , timesMark = ''] = WRITTEN_QUANTITY.exec(writtenLine) ?? [];
  return `${beforeQuantity}${quantity}${timesMark} ${card}`;
}

/** How many copies `lines` ask for in all, printable or not. */
export function copyCount(lines: readonly DecklistLine[]): number {
  return lines.reduce((count, line) => count + line.quantity, 0);
}
