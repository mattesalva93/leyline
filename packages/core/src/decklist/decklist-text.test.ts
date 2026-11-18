import { describe, expect, it } from 'vitest';
import {
  allocatePrintCopies,
  applyAllocationChoice,
  changeTileQuantity,
  printTiles,
  createInMemoryCatalog,
  resolveDecklist,
  type DecklistLine,
  withoutWrittenLine,
  type ResolvedLine,
} from '../index.ts';
import { aCard, aPrint } from '../test-support/test-fixtures.ts';

const today = '2026-11-07';
const forest = aCard({ oracleId: 'forest', name: 'Forest' });
const forestFdn = aPrint({ id: 'forest-fdn', set: 'fdn', releasedAt: '2024-11-15' });
const forestM21 = aPrint({ id: 'forest-m21', set: 'm21', releasedAt: '2020-07-03' });
const forestZnr = aPrint({ id: 'forest-znr', set: 'znr', releasedAt: '2020-09-25' });
const catalog = createInMemoryCatalog([
  { card: forest, prints: [forestFdn, forestM21, forestZnr] },
]);

function resolved(line: DecklistLine | undefined): ResolvedLine {
  if (line?.status !== 'resolved') throw new Error('expected a resolved line');
  return line;
}

/** The line `writtenLine` resolves to. */
async function lineOf(writtenLine: string) {
  const [line] = await resolveDecklist(writtenLine, catalog, { today, lang: 'en' });
  return resolved(line);
}

/** The line with `copies` of its copies moved onto `print`. */
function withCopiesOn(line: ResolvedLine, print: typeof forestM21, copies: number): ResolvedLine {
  return resolved(applyAllocationChoice(line, allocatePrintCopies(line, print, copies)));
}

/** The tiles of `line` as (print id, quantity) pairs; none when the line is gone. */
function tilesById(line: ResolvedLine | null) {
  return line ? printTiles(line).map(({ print, quantity }) => [print.id, quantity]) : [];
}

describe('changeTileQuantity', () => {
  it("rewrites the quantity of the tile's line in the text, and no other line", async () => {
    const text = '4 Forest\n// lands\n\n2 Forest';
    const line = await lineOf('2 Forest');

    const change = changeTileQuantity(text, { writtenIndex: 3, line, print: forestFdn }, 3);

    expect(change.text).toBe('4 Forest\n// lands\n\n3 Forest');
  });

  it("adds a copy to a sibling tile's own print, leaving the other tiles as they were", async () => {
    const line = withCopiesOn(withCopiesOn(await lineOf('6 Forest'), forestM21, 2), forestZnr, 1);

    const change = changeTileQuantity('6 Forest', { writtenIndex: 0, line, print: forestM21 }, 3);

    expect(change.text).toBe('7 Forest');
    expect(tilesById(change.line)).toEqual([
      ['forest-fdn', 3],
      ['forest-m21', 3],
      ['forest-znr', 1],
    ]);
  });

  it('adds a copy to a print no copy uses yet, as a tile of its own', async () => {
    const line = await lineOf('4 Forest');

    const change = changeTileQuantity('4 Forest', { writtenIndex: 0, line, print: forestZnr }, 1);

    expect(change.text).toBe('5 Forest');
    expect(tilesById(change.line)).toEqual([
      ['forest-fdn', 4],
      ['forest-znr', 1],
    ]);
  });

  it("takes copies off the default print's tile from its unallocated copies first, then from its own allocation", async () => {
    const line = withCopiesOn(withCopiesOn(await lineOf('6 Forest'), forestFdn, 2), forestM21, 1);

    const change = changeTileQuantity('6 Forest', { writtenIndex: 0, line, print: forestFdn }, 1);

    expect(change.text).toBe('2 Forest');
    expect(change.line?.allocations.map(({ print, quantity }) => [print.id, quantity])).toEqual([
      ['forest-fdn', 1],
      ['forest-m21', 1],
    ]);
  });

  it('drops a tile brought to zero and keeps its siblings', async () => {
    const line = withCopiesOn(await lineOf('4 Forest'), forestM21, 1);

    const change = changeTileQuantity('4 Forest', { writtenIndex: 0, line, print: forestFdn }, 0);

    expect(change.text).toBe('1 Forest');
    expect(tilesById(change.line)).toEqual([['forest-m21', 1]]);
  });

  it('removes the line from the text with its last tile, keeping blank lines, comments and headers', async () => {
    const text = 'Deck\n2 Forest\n\n// sideboard next\nSideboard\n1 Forest';
    const line = await lineOf('2 Forest');

    const change = changeTileQuantity(text, { writtenIndex: 1, line, print: forestFdn }, 0);

    expect(change.text).toBe('Deck\n\n// sideboard next\nSideboard\n1 Forest');
    expect(change.line).toBeNull();
  });
});

describe('withoutWrittenLine', () => {
  it('removes only the line written at the index, keeping blank lines, comments and headers', () => {
    const text = 'Deck\n2 Forest\n\n// sideboard next\nSideboard\n1 Nonexistent Card\n1 Forest';

    expect(withoutWrittenLine(text, 5)).toBe(
      'Deck\n2 Forest\n\n// sideboard next\nSideboard\n1 Forest',
    );
  });
});
