import { copiesByPrint } from '../print/allocation.ts';
import { qualityWarning } from '../print/default-print.ts';
import { writtenFromParts, writtenLineParts } from '../decklist/decklist.ts';
import { printTiles } from '../print/print-tile.ts';
import { isTokenLayout } from '../print/print-order.ts';
import type { AllocationChoice, Print, ResolvedLine } from '../types.ts';

/** Whether `print` is a token's or an emblem's, whose line names its print, not just its name. */
export function isTokenPrint(print: Print | null): print is Print {
  return print !== null && isTokenLayout(print.layout);
}

/**
 * The written line rewritten to name `print` of the card `cardName` by its set and number, so it
 * means that print and no other token sharing the name. It keeps its quantity and what comes
 * before it.
 */
export function writtenNamingPrint(writtenLine: string, cardName: string, print: Print): string {
  const { quantity } = writtenLineParts(writtenLine);
  return writtenFromParts(
    writtenLine,
    quantity,
    `${cardName} (${print.set.toUpperCase()}) ${print.collectorNumber}`,
  );
}

/** A token line rewritten to name the print it uses most. */
export interface RewrittenTokenLine {
  /** What the rewritten text resolves to: the named print is its default print. */
  readonly resolution: ResolvedLine;
  /**
   * The line's allocations, which keep every copy where it was: the copies the old default print
   * held are allocated to it once it is no longer the default.
   */
  readonly allocations: AllocationChoice;
}

/**
 * The token line, as its choices made it, rewritten to name the print most of its copies use;
 * on a tie, the print of its first tile. `null` when the line names that print already, or is
 * not a token's.
 */
export function tokenLineNamingItsPrint(line: ResolvedLine): RewrittenTokenLine | null {
  const [firstTile, ...otherTiles] = printTiles(line);
  if (!firstTile) return null;
  const { print } = otherTiles.reduce(
    (most, tile) => (tile.quantity > most.quantity ? tile : most),
    firstTile,
  );
  if (!isTokenPrint(print)) return null;
  const text = writtenNamingPrint(line.text, line.card.name, print);
  const keepsItsDefault = print.id === line.defaultPrint?.id;
  if (keepsItsDefault && text === line.text) return null;
  return {
    resolution: {
      ...line,
      text,
      lang: keepsItsDefault ? line.lang : print.lang,
      defaultPrint: print,
      printWarning: qualityWarning(print, line.printWarning !== 'lowResolutionWithoutEnglish'),
      allocations: [],
    },
    allocations: {
      oracleId: line.card.oracleId,
      allocations: keepsItsDefault ? line.allocations : copiesByPrint(line),
    },
  };
}
