import { defaultPrintFor, hasRealImage } from '../print/default-print.ts';
import { namedPrint, previewPrint, type PrintRef } from '../decklist/decklist.ts';
import type {
  Catalog,
  CatalogEntry,
  CreatedToken,
  DecklistLine,
  Lang,
  TokenQueryLine,
  Print,
  ResolvedLine,
  SuggestedToken,
} from '../types.ts';

export interface TokenSuggestionOptions {
  /** The language suggested tokens print in, falling back as decklist lines do. */
  readonly lang: Lang;
  /** Today's date (ISO, `YYYY-MM-DD`), for the default print of a token. */
  readonly today: string;
}

/** What `line` tells which tokens its card creates, or `null` when it is not resolved. */
export function tokenQueryLineOf(line: ResolvedLine): TokenQueryLine;
export function tokenQueryLineOf(line: DecklistLine): TokenQueryLine | null;
export function tokenQueryLineOf(line: DecklistLine): TokenQueryLine | null {
  if (line.status !== 'resolved') return null;
  return { oracleId: line.card.oracleId, previewPrintId: previewPrint(line)?.id ?? null };
}

/**
 * The lines of `lines` to ask the tokens of, in their order: the resolved ones, a card shown
 * at the same print once, at its first line. Another print may create other tokens, so a card
 * shown at two prints is asked twice.
 */
export function linesAskedForTokens(lines: readonly DecklistLine[]): ResolvedLine[] {
  const askedKeys = new Set<string>();
  return lines.filter((line): line is ResolvedLine => {
    const queryLine = tokenQueryLineOf(line);
    if (queryLine === null) return false;
    const key = JSON.stringify([queryLine.oracleId, queryLine.previewPrintId]);
    if (askedKeys.has(key)) return false;
    askedKeys.add(key);
    return true;
  });
}

/**
 * The names of the cards of `lines` creating `token`, first creator first, each card once, as
 * the print its line shows reads it: `lines` are the ones whose `TokenQueryLine`s were asked for
 * the suggestion, in the order asked.
 */
export function tokenCreatorNamesOf(
  token: SuggestedToken,
  lines: readonly DecklistLine[],
): string[] {
  const queriedLines = lines.filter(
    (line): line is ResolvedLine => tokenQueryLineOf(line) !== null,
  );
  const creatingLines = token.createdBy.flatMap((index) => queriedLines[index] ?? []);
  const firstLineOfEachCard = creatingLines.filter(
    (line, index) =>
      creatingLines.findIndex(({ card }) => card.oracleId === line.card.oracleId) === index,
  );
  return firstLineOfEachCard.map((line) => previewPrint(line)?.printedName ?? line.card.name);
}

/**
 * The tokens the cards of `queryLines` create, one per token card, first creator first: each at
 * the print the first card creating it names, or at the token's default print when that one is
 * not printable or not out yet. A token one of `queryLines` already is, in any print, is no
 * suggestion.
 */
export async function suggestTokens(
  catalog: Catalog,
  queryLines: readonly TokenQueryLine[],
  { lang, today }: TokenSuggestionOptions,
): Promise<SuggestedToken[]> {
  const printIds = queryLines.flatMap((queryLine) => queryLine.previewPrintId ?? []);
  const created = await catalog.findTokensCreatedBy([...new Set(printIds)]);
  const inDecklist = new Set(queryLines.map((queryLine) => queryLine.oracleId));
  const byToken = new Map<string, { created: CreatedToken; createdBy: number[] }>();
  queryLines.forEach((queryLine, index) => {
    for (const link of created) {
      if (link.creatorPrintId !== queryLine.previewPrintId) continue;
      const oracleId = link.token.card.oracleId;
      if (inDecklist.has(oracleId)) continue;
      const suggestion = byToken.get(oracleId) ?? { created: link, createdBy: [] };
      if (!suggestion.createdBy.includes(index)) suggestion.createdBy.push(index);
      byToken.set(oracleId, suggestion);
    }
  });
  return [...byToken.values()].flatMap(({ created: { token, tokenPrintId }, createdBy }) => {
    const print = printToWrite(token, tokenPrintId, lang, today);
    const candidate = print && namedPrint([token], refOf(print), lang);
    if (!candidate?.defaultPrint) return [];
    const { lang: lineLang, defaultPrint, ...rest } = candidate;
    return [{ candidate: { ...rest, defaultPrint }, lang: lineLang, createdBy }];
  });
}

/** The named token print when it is printable and out already, else the token's default print. */
function printToWrite(
  token: CatalogEntry,
  tokenPrintId: string,
  lang: Lang,
  today: string,
): Print | null {
  const named = token.prints.find((print) => print.id === tokenPrintId);
  if (named && hasRealImage(named) && named.releasedAt <= today) return named;
  return defaultPrintFor(token.prints, lang, today).defaultPrint;
}

function refOf(print: Print): PrintRef {
  return { set: print.set, collectorNumber: print.collectorNumber.toLowerCase() };
}
