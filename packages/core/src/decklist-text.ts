import { applyAllocationChoice, copiesByPrint, unallocatedCopies } from './allocation.ts';
import { setLineQuantity } from './decklist.ts';
import { LINE_BREAK } from './line-breaks.ts';
import type { Allocation, Print, ResolvedLine } from './types.ts';

/** The lines of a decklist text as the user wrote them, blank ones, comments and headers too. */
export function writtenLinesOf(text: string): string[] {
  return text.split(LINE_BREAK);
}

/** The decklist text without the line written at `writtenIndex`, every other line as it was. */
function withoutWrittenLine(text: string, writtenIndex: number): string {
  return writtenLinesOf(text).toSpliced(writtenIndex, 1).join('\n');
}

/** A tile as the decklist text holds it: the line it belongs to, where that is written, and its print. */
export interface TileInText {
  readonly writtenIndex: number;
  readonly line: ResolvedLine;
  readonly print: Print;
}

/** What changing a tile's quantity makes of the decklist text and of the tile's line. */
export interface TileQuantityChange {
  readonly text: string;
  /** The line with its new quantity and allocations; `null` when it has no copies left. */
  readonly line: ResolvedLine | null;
}

/**
 * The decklist text and the tile's line once the tile holds `quantity` copies. The line's
 * quantity changes by as many copies as the tile's, and so does the allocation of the tile's
 * print: copies taken off the default print's tile leave its unallocated copies first.
 */
export function changeTileQuantity(
  text: string,
  { writtenIndex, line, print }: TileInText,
  quantity: number,
): TileQuantityChange {
  const tileQuantity =
    copiesByPrint(line).find((copies) => copies.print.id === print.id)?.quantity ?? 0;
  const added = quantity - tileQuantity;
  const lineQuantity = line.quantity + added;
  if (lineQuantity <= 0) return { text: withoutWrittenLine(text, writtenIndex), line: null };
  const isDefault = print.id === line.defaultPrint?.id;
  const printAllocationChange = isDefault ? Math.min(added + unallocatedCopies(line), 0) : added;
  const allocations = line.allocations.flatMap((allocation): Allocation[] => {
    if (allocation.print.id !== print.id) return [allocation];
    const copies = allocation.quantity + printAllocationChange;
    return copies > 0 ? [{ ...allocation, quantity: copies }] : [];
  });
  const rewritten = setLineQuantity(line, lineQuantity);
  const changed = applyAllocationChoice(rewritten, { oracleId: line.card.oracleId, allocations });
  return {
    text: writtenLinesOf(text).with(writtenIndex, rewritten.text).join('\n'),
    line: changed.status === 'resolved' ? changed : null,
  };
}
