import { describe, expect, it } from 'vitest';
import {
  allocatePrintCopies,
  applyAllocationChoice,
  createInMemoryCatalog,
  printTiles,
  resolveDecklist,
  type DecklistLine,
  type ResolvedLine,
} from './index.ts';
import { aCard, aPrint } from './test-fixtures.ts';

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

async function forestLine(quantity: number): Promise<ResolvedLine> {
  const [line] = await resolveDecklist(`${quantity} Forest`, catalog, { today, lang: 'en' });
  return resolved(line);
}

/** The line with `copies` more of its copies moved onto `print`. */
function withCopiesOn(line: ResolvedLine, print: typeof forestM21, copies: number): ResolvedLine {
  return resolved(applyAllocationChoice(line, allocatePrintCopies(line, print, copies)));
}

/** The tiles as (print id, quantity) pairs. */
function tilesById(line: ResolvedLine) {
  return printTiles(line).map(({ print, quantity }) => [print.id, quantity]);
}

describe('printTiles', () => {
  it('gives a line the user never touched one tile, its default print with every copy', async () => {
    expect(tilesById(await forestLine(4))).toEqual([['forest-fdn', 4]]);
  });

  it('gives each distinct print its own tile, the unallocated copies on the default print', async () => {
    const line = withCopiesOn(withCopiesOn(await forestLine(10), forestM21, 3), forestZnr, 2);

    expect(tilesById(line)).toEqual([
      ['forest-m21', 3],
      ['forest-znr', 2],
      ['forest-fdn', 5],
    ]);
  });

  it('gives the default print one tile when the user also allocated copies to it', async () => {
    const line = withCopiesOn(withCopiesOn(await forestLine(4), forestM21, 1), forestFdn, 2);

    expect(tilesById(line)).toEqual([
      ['forest-m21', 1],
      ['forest-fdn', 3],
    ]);
  });

  it('drops the default print tile once every copy is allocated elsewhere', async () => {
    const line = withCopiesOn(await forestLine(3), forestM21, 3);

    expect(tilesById(line)).toEqual([['forest-m21', 3]]);
  });

  it('keeps the tiles in the order their copies print', async () => {
    const line = withCopiesOn(withCopiesOn(await forestLine(6), forestZnr, 1), forestM21, 1);

    expect(tilesById(line)).toEqual([
      ['forest-znr', 1],
      ['forest-m21', 1],
      ['forest-fdn', 4],
    ]);
  });

  it('gives a line with no printable print no tile', async () => {
    const noPrint = { ...(await forestLine(2)), defaultPrint: null };

    expect(printTiles(noPrint)).toEqual([]);
  });
});
