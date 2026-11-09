import { defaultPrint } from './default-print.ts';
import type { Catalog, CatalogEntry, DecklistLine } from './types.ts';

export interface ResolveOptions {
  /** Today's date (ISO, `YYYY-MM-DD`): prints released later are not default candidates. */
  readonly today: string;
}

interface ParsedLine {
  readonly text: string;
  readonly quantity: number;
  readonly name: string;
}

const QUANTITY_NAME = /^(\d+)\s+(.+)$/;

function parseLine(text: string): ParsedLine {
  const trimmed = text.trim();
  const match = QUANTITY_NAME.exec(trimmed);
  if (!match?.[1] || !match[2]) return { text, quantity: 1, name: trimmed };
  return { text, quantity: Number(match[1]), name: match[2] };
}

/** Lookup key for names: case and spacing do not matter. */
function nameKey(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

const FACE_SEPARATOR = ' // ';

/** Keys a line may use for a card: its full name, and its front face for multi-face cards. */
function cardNameKeys(cardName: string): string[] {
  const [frontFace] = cardName.split(FACE_SEPARATOR);
  const keys = [nameKey(cardName)];
  if (frontFace !== undefined && frontFace !== cardName) keys.push(nameKey(frontFace));
  return keys;
}

/**
 * Parses a decklist ("quantity name" lines, or just a name for one copy; blank lines skipped)
 * and resolves each line by exact English name, ignoring case and spacing.
 */
export async function resolveDecklist(
  text: string,
  catalog: Catalog,
  options: ResolveOptions,
): Promise<DecklistLine[]> {
  const parsed = text
    .split(/\r?\n/)
    .filter((raw) => raw.trim() !== '')
    .map(parseLine);
  const entries = await catalog.findByNames([...new Set(parsed.map((line) => nameKey(line.name)))]);

  return parsed.map((line) => resolveLine(line, entries, options.today));
}

function resolveLine(
  line: ParsedLine,
  entries: readonly CatalogEntry[],
  today: string,
): DecklistLine {
  const base = { text: line.text, quantity: line.quantity, lang: 'en' } as const;
  const key = nameKey(line.name);
  const matches = entries
    .filter((e) => cardNameKeys(e.card.name).includes(key))
    .map((e) => ({ card: e.card, defaultPrint: defaultPrint(e.prints, base.lang, today) }));
  // Cards that can be printed win: art series, for one, are separate cards sharing the name.
  const printable = matches.filter((match) => match.defaultPrint);
  const candidates = printable.length > 0 ? printable : matches;
  const [match] = candidates;
  if (!match) return { ...base, status: 'notFound' };
  if (candidates.length > 1) {
    return { ...base, status: 'ambiguous', candidates: candidates.map((c) => c.card) };
  }
  return { ...base, status: 'resolved', ...match, allocations: [] };
}
