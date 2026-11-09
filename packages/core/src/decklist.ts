import { defaultPrintFor, hasRealImage, qualityWarning } from './default-print.ts';
import { cardKeys, nameKey, trigramSimilarity, trigrams } from './name-match.ts';
import type {
  AmbiguousLine,
  Candidate,
  Catalog,
  CatalogEntry,
  DecklistLine,
  Lang,
  ResolvedLine,
} from './types.ts';

/** Least trigram similarity for a misspelled name to match a card: pg_trgm's default. */
const MIN_SIMILARITY = 0.3;
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
interface PrintRef {
  readonly set: string;
  readonly collectorNumber: string;
}

interface ParsedLine {
  readonly text: string;
  readonly quantity: number;
  readonly name: string;
  readonly printRef: PrintRef | null;
}

const QUANTITY_NAME = /^(\d+)x?\s+(.+)$/i;
/** "Sol Ring (C21) 263", maybe with a finish marker such as "*F*" (foil) after the number. */
const NAME_SET_NUMBER = /^(.+?)\s+\(([A-Za-z0-9]+)\)\s+(\S+)(?:\s+\*[A-Za-z]+\*)?$/;
/** MTGO and some deckbuilders mark sideboard cards with an "SB:" prefix. */
const SIDEBOARD_PREFIX = /^SB:\s*/i;
const COMMENT = /^(\/\/|#)/;
/** Section names deckbuilders write on a line of their own; no card has one as its name. */
const SECTIONS = new Set([
  'about',
  'artifacts',
  'battles',
  'commander',
  'commanders',
  'companion',
  'considering',
  'creatures',
  'deck',
  'enchantments',
  'instants',
  'lands',
  'main',
  'main deck',
  'mainboard',
  'maybeboard',
  'other',
  'planeswalkers',
  'sideboard',
  'sorceries',
  'spells',
  'tokens',
]);
/** A section header: a section name, maybe followed by a card count and a colon. */
const SECTION_HEADER = /^(.+?)\s*(\(\d+\))?\s*:?$/;

function isIgnored(trimmed: string): boolean {
  if (trimmed === '' || COMMENT.test(trimmed)) return true;
  const section = SECTION_HEADER.exec(trimmed)?.[1];
  return section !== undefined && SECTIONS.has(nameKey(section));
}

/** The card a line asks for, or `null` for blank lines, comments and section headers. */
function parseLine(text: string): ParsedLine | null {
  const trimmed = text.trim().replace(SIDEBOARD_PREFIX, '');
  if (isIgnored(trimmed)) return null;
  const quantityMatch = QUANTITY_NAME.exec(trimmed);
  const quantity = quantityMatch?.[1] ? Number(quantityMatch[1]) : 1;
  const rest = quantityMatch?.[2] ?? trimmed;
  const [, name, set, collectorNumber] = NAME_SET_NUMBER.exec(rest) ?? [];
  if (!name || !set || !collectorNumber) return { text, quantity, name: rest, printRef: null };
  return {
    text,
    quantity,
    name,
    printRef: { set: set.toLowerCase(), collectorNumber: collectorNumber.toLowerCase() },
  };
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
  const parsed = text.split(/\r?\n/).flatMap((raw) => parseLine(raw) ?? []);
  const names = [...new Set(parsed.map((line) => nameKey(line.name)))];
  const entries = await catalog.findByNames(names, { minSimilarity: MIN_SIMILARITY });
  // Keys and trigrams once per entry, not once per line: a decklist has a hundred lines.
  const named = entries.map((entry) => {
    const keys = cardKeys(
      entry.card.name,
      entry.prints.map((print) => print.printedName),
    );
    return { entry, keys, trigrams: keys.map(trigrams) };
  });

  return parsed.map((line) => resolveLine(line, named, options));
}

/** A catalog entry with the name keys it answers to, ready to compare. */
interface NamedEntry {
  readonly entry: CatalogEntry;
  readonly keys: readonly string[];
  readonly trigrams: readonly ReadonlySet<string>[];
}

type LineBase = Pick<DecklistLine, 'text' | 'quantity' | 'lang'>;

function resolvedLine(base: LineBase, candidate: Candidate): ResolvedLine {
  return { ...base, status: 'resolved', ...candidate, allocations: [] };
}

function resolveLine(
  line: ParsedLine,
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
  const matches = closest.map((entry) => ({
    card: entry.card,
    ...defaultPrintFor(entry.prints, lang, today),
  }));
  // Cards that can be printed win: art series, for one, are separate cards sharing the name.
  const printable = matches.filter((match) => match.defaultPrint);
  const candidates = printable.length > 0 ? printable : matches;
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
function namedPrint(
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
  return {
    card: match.card,
    defaultPrint: match.print,
    lang: stoodIn ? lang : match.print.lang,
    printWarning: stoodIn ? 'languageFallback' : qualityWarning(match.print),
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

/** The line with `quantity` copies. */
export function setLineQuantity(line: DecklistLine, quantity: number): DecklistLine {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error(`A line prints a whole number of copies, at least one: got ${quantity}`);
  }
  return { ...line, quantity };
}
