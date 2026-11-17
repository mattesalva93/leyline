/**
 * A palette index for each region of a grid laid out row by row, `columns` cells a row, where
 * `null` cells belong to no region: two regions sharing a side get different indices while
 * `paletteSize` allows it. Past that, the clash falls on the fewest shared sides, where it shows
 * least.
 */
export function regionPaletteIndicesOf<Region>(
  cells: readonly (Region | null)[],
  columns: number,
  paletteSize: number,
): ReadonlyMap<Region, number> {
  const sharedSides = sharedSidesOf(cells, columns);
  const paletteIndices = new Map<Region, number>();
  for (const region of cells) {
    if (region === null || paletteIndices.has(region)) continue;
    const sidesByPaletteIndex = Array.from({ length: paletteSize }, () => 0);
    for (const [neighbour, sides] of sharedSides.get(region) ?? []) {
      const paletteIndex = paletteIndices.get(neighbour);
      if (paletteIndex !== undefined) {
        sidesByPaletteIndex[paletteIndex] = (sidesByPaletteIndex[paletteIndex] ?? 0) + sides;
      }
    }
    paletteIndices.set(region, sidesByPaletteIndex.indexOf(Math.min(...sidesByPaletteIndex)));
  }
  return paletteIndices;
}

/** How many sides each region shares with each other region. */
function sharedSidesOf<Region>(
  cells: readonly (Region | null)[],
  columns: number,
): Map<Region, Map<Region, number>> {
  const sharedSides = new Map<Region, Map<Region, number>>();
  const addSide = (from: Region, to: Region) => {
    const sidesOfFrom = sharedSides.get(from) ?? new Map<Region, number>();
    sidesOfFrom.set(to, (sidesOfFrom.get(to) ?? 0) + 1);
    sharedSides.set(from, sidesOfFrom);
  };
  const touch = (region: Region | null, other: Region | null | undefined) => {
    if (region === null || other === null || other === undefined || other === region) return;
    addSide(region, other);
    addSide(other, region);
  };
  cells.forEach((region, index) => {
    const isLastOfRow = index % columns === columns - 1;
    if (!isLastOfRow) touch(region, cells[index + 1]);
    touch(region, cells[index + columns]);
  });
  return sharedSides;
}
