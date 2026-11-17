/**
 * A colour for each group of cells in a grid laid out row by row, `columns` cells a row, so that
 * two groups sharing a side never share a colour while `colourCount` colours allow it. `null`
 * cells belong to no group. Groups take their colours in the order of the grid: each the first
 * colour no neighbour already holds or, when every colour is held, the one whose groups share
 * the fewest sides with it.
 */
export function touchingGroupColoursOf<Group>(
  cells: readonly (Group | null)[],
  columns: number,
  colourCount: number,
): ReadonlyMap<Group, number> {
  const sharedSides = sharedSidesOf(cells, columns);
  const colours = new Map<Group, number>();
  for (const group of cells) {
    if (group === null || colours.has(group)) continue;
    const sidesByColour = Array.from({ length: colourCount }, () => 0);
    for (const [neighbour, sides] of sharedSides.get(group) ?? []) {
      const colour = colours.get(neighbour);
      if (colour !== undefined) sidesByColour[colour] = (sidesByColour[colour] ?? 0) + sides;
    }
    colours.set(group, sidesByColour.indexOf(Math.min(...sidesByColour)));
  }
  return colours;
}

/**
 * How many sides each group shares with each other group: a cell's side with the cell to its
 * right, in the same row, and with the cell below it.
 */
function sharedSidesOf<Group>(
  cells: readonly (Group | null)[],
  columns: number,
): Map<Group, Map<Group, number>> {
  const sharedSides = new Map<Group, Map<Group, number>>();
  const addSide = (from: Group, to: Group) => {
    const sidesOfFrom = sharedSides.get(from) ?? new Map<Group, number>();
    sidesOfFrom.set(to, (sidesOfFrom.get(to) ?? 0) + 1);
    sharedSides.set(from, sidesOfFrom);
  };
  const touch = (group: Group | null, other: Group | null | undefined) => {
    if (group === null || other === null || other === undefined || other === group) return;
    addSide(group, other);
    addSide(other, group);
  };
  cells.forEach((group, index) => {
    const isLastOfRow = index % columns === columns - 1;
    if (!isLastOfRow) touch(group, cells[index + 1]);
    touch(group, cells[index + columns]);
  });
  return sharedSides;
}
