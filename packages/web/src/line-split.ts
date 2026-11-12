import type { AllocationChoice, Print, ResolvedLine } from '@mtg-suite/core';

/** A written line to show split over its `printCount` newest prints once it is resolved. */
export interface LineSplitOverPrints {
  readonly writtenIndex: number;
  readonly printCount: number;
}

/**
 * The allocations that split `line` over `newestPrints`: a copy on each print but the default,
 * at most as many as leave the default print a copy, and the rest on the default print.
 */
export function allocationsSplitOverPrints(
  line: ResolvedLine,
  newestPrints: readonly Print[],
  printCount: number,
): AllocationChoice {
  const others = newestPrints
    .filter((print) => print.id !== line.defaultPrint?.id)
    .slice(0, Math.min(printCount, line.quantity) - 1);
  return {
    oracleId: line.card.oracleId,
    allocations: others.map((print) => ({ print, quantity: 1 })),
  };
}
