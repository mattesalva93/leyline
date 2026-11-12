import { mostSeriousWarning, qualityWarning } from './default-print.ts';
import type {
  Allocation,
  AllocationChoice,
  DecklistLine,
  Print,
  PrintWarning,
  ResolvedLine,
} from './types.ts';

/**
 * The line with the copies the user allocated to prints, in whatever language the prints are.
 * Like the candidate choice, the choice is kept apart from the line: it applies only while the
 * line resolves to the chosen card, whatever its language, and any other line comes back as it is.
 */
export function applyAllocationChoice(
  line: DecklistLine,
  { oracleId, allocations }: AllocationChoice,
): DecklistLine {
  if (line.status !== 'resolved' || line.card.oracleId !== oracleId) return line;
  const fitted = fitAllocations({ oracleId, allocations }, line.quantity).allocations;
  const allocated = { ...line, allocations: fitted };
  return { ...allocated, printWarning: worstWarning(allocated) };
}

/** The most serious warning among the prints the line's copies use. */
function worstWarning(line: ResolvedLine): PrintWarning | null {
  return mostSeriousWarning(copiesByPrint(line).map(({ print }) => warningOfPrint(line, print)));
}

/** What to warn about `print` used by some of the copies of `line`, if anything. */
export function warningOfPrint(line: ResolvedLine, print: Print): PrintWarning | null {
  // Any other print in another language is one the user chose, so nothing to warn about.
  const standsIn = print.id === line.defaultPrint?.id && print.lang !== line.lang;
  if (standsIn) return 'languageFallback';
  // A card printed in Italian virtually always has an English print with a real image too,
  // unless the line's warning says it has none.
  return qualityWarning(print, line.printWarning !== 'lowResolutionWithoutEnglish');
}

/**
 * How many copies of each print the line puts on the sheet, in the order they print: its
 * allocations, then the copies left with the default print.
 */
export function copiesByPrint(line: ResolvedLine): Allocation[] {
  const byPrint = new Map<string, Allocation>();
  const unallocated = line.defaultPrint && {
    print: line.defaultPrint,
    quantity: unallocatedCopies(line),
  };
  for (const { print, quantity } of [...line.allocations, ...(unallocated ? [unallocated] : [])]) {
    if (quantity <= 0) continue;
    byPrint.set(print.id, { print, quantity: (byPrint.get(print.id)?.quantity ?? 0) + quantity });
  }
  return [...byPrint.values()];
}

/** How many of the line's copies the user allocated to `print` itself. */
export function copiesAllocatedTo(line: ResolvedLine, print: Print): number {
  return line.allocations.find((allocation) => allocation.print.id === print.id)?.quantity ?? 0;
}

/** How many of the line's copies no allocation takes: they print with the default print. */
export function unallocatedCopies(line: ResolvedLine): number {
  return line.quantity - sumOfCopies(line.allocations);
}

/**
 * The line's allocation choice with `copies` copies of `print`. The print becomes the line's
 * most recently changed allocation.
 */
export function allocatePrintCopies(
  line: ResolvedLine,
  print: Print,
  copies: number,
): AllocationChoice {
  const others = line.allocations.filter((allocation) => allocation.print.id !== print.id);
  const quantity = Math.min(copies, line.quantity - sumOfCopies(others));
  return {
    oracleId: line.card.oracleId,
    allocations: quantity > 0 ? [...others, { print, quantity }] : others,
  };
}

/** The allocation choice printing every copy of `line` with `print`. */
export function allocateEveryCopy(line: ResolvedLine, print: Print): AllocationChoice {
  return { oracleId: line.card.oracleId, allocations: [{ print, quantity: line.quantity }] };
}

/**
 * The allocation choice of a line now printing `lineQuantity` copies. The copies left with the
 * default print go first; then copies come off the allocations, the most recently changed first.
 */
export function fitAllocations(choice: AllocationChoice, lineQuantity: number): AllocationChoice {
  let excess = sumOfCopies(choice.allocations) - lineQuantity;
  const fitted: Allocation[] = [];
  for (const allocation of choice.allocations.toReversed()) {
    const taken = Math.min(Math.max(excess, 0), allocation.quantity);
    excess -= taken;
    if (allocation.quantity > taken) {
      fitted.unshift({ ...allocation, quantity: allocation.quantity - taken });
    }
  }
  return { ...choice, allocations: fitted };
}

/** How many copies `allocations` take together. */
function sumOfCopies(allocations: readonly Allocation[]): number {
  return allocations.reduce((sum, allocation) => sum + allocation.quantity, 0);
}
