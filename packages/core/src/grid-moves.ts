/** The way an arrow key points. */
export type Arrow = 'left' | 'right' | 'up' | 'down';

/** One run of cells laid out in rows of `columns`, as a section of the card grid lays its tiles. */
export interface CellGroup {
  readonly cellCount: number;
  readonly columns: number;
}

/** A cell of the card grid: its group, then its place in the group's reading order. */
export interface CellPlace {
  readonly group: number;
  readonly index: number;
}

function rowOf(index: number, columns: number): number {
  return Math.floor(index / columns);
}

/**
 * The cell an arrow moves to from `from`. Left and right follow the reading order, on through the
 * next group; up and down keep the column, landing on the last cell of a shorter row, and cross
 * into the group above or below. Past the edges of the grid, it stays put.
 */
export function cellAfterArrow(
  groups: readonly CellGroup[],
  from: CellPlace,
  arrow: Arrow,
): CellPlace {
  const group = groups[from.group];
  if (!group) return from;
  const { cellCount, columns } = group;
  const lastIndex = cellCount - 1;
  const column = from.index % columns;
  const previous = groups[from.group - 1];
  const next = groups[from.group + 1];
  switch (arrow) {
    case 'right':
      if (from.index < lastIndex) return { group: from.group, index: from.index + 1 };
      return next ? { group: from.group + 1, index: 0 } : from;
    case 'left':
      if (from.index > 0) return { group: from.group, index: from.index - 1 };
      return previous ? { group: from.group - 1, index: previous.cellCount - 1 } : from;
    case 'down':
      if (rowOf(from.index, columns) < rowOf(lastIndex, columns)) {
        return { group: from.group, index: Math.min(from.index + columns, lastIndex) };
      }
      return next ? { group: from.group + 1, index: Math.min(column, next.cellCount - 1) } : from;
    case 'up': {
      if (from.index >= columns) return { group: from.group, index: from.index - columns };
      if (!previous) return from;
      const lastRowStart = rowOf(previous.cellCount - 1, previous.columns) * previous.columns;
      return {
        group: from.group - 1,
        index: Math.min(lastRowStart + column, previous.cellCount - 1),
      };
    }
  }
}
