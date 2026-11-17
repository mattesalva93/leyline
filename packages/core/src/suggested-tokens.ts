import { defaultPrintFor, hasRealImage } from './default-print.ts';
import { namedPrint, previewPrint, type PrintRef } from './decklist.ts';
import type {
  Catalog,
  CatalogEntry,
  CreatedToken,
  DecklistLine,
  Lang,
  LineCard,
  Print,
  SuggestedToken,
} from './types.ts';

export interface TokenSuggestionOptions {
  /** The language suggested tokens print in, falling back as decklist lines do. */
  readonly lang: Lang;
  /** Today's date (ISO, `YYYY-MM-DD`), for the default print of a token. */
  readonly today: string;
}

/** What `line` tells which tokens its card creates, or `null` when it is not resolved. */
export function lineCardOf(line: DecklistLine): LineCard | null {
  if (line.status !== 'resolved') return null;
  return { oracleId: line.card.oracleId, previewPrintId: previewPrint(line)?.id ?? null };
}

/**
 * The tokens the cards of `lineCards` create, one per token card, first creator first: each at
 * the print the first card creating it names, or at the token's default print when that one has
 * no scan. A token one of `lineCards` already is, in any print, is no suggestion.
 */
export async function suggestTokens(
  catalog: Catalog,
  lineCards: readonly LineCard[],
  { lang, today }: TokenSuggestionOptions,
): Promise<SuggestedToken[]> {
  const printIds = lineCards.flatMap((lineCard) => lineCard.previewPrintId ?? []);
  const created = await catalog.findTokensCreatedBy([...new Set(printIds)]);
  const inDecklist = new Set(lineCards.map((lineCard) => lineCard.oracleId));
  const byToken = new Map<string, { created: CreatedToken; createdBy: number[] }>();
  lineCards.forEach((lineCard, index) => {
    for (const link of created) {
      if (link.creatorPrintId !== lineCard.previewPrintId) continue;
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

/** The named token print when it has a scan, otherwise the token's default print. */
function printToWrite(
  token: CatalogEntry,
  tokenPrintId: string,
  lang: Lang,
  today: string,
): Print | null {
  const named = token.prints.find((print) => print.id === tokenPrintId);
  if (named && hasRealImage(named)) return named;
  return defaultPrintFor(token.prints, lang, today).defaultPrint;
}

function refOf(print: Print): PrintRef {
  return { set: print.set, collectorNumber: print.collectorNumber.toLowerCase() };
}
