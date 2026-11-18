import { writtenFromParts, writtenLineParts } from './decklist.ts';
import { isTokenLayout } from './print-order.ts';
import type { Print } from './types.ts';

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
