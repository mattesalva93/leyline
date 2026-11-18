import { describe, expect, it } from 'vitest';
import {
  allocatePrintCopies,
  applyAllocationChoice,
  createInMemoryCatalog,
  printTiles,
  resolveDecklist,
  type DecklistLine,
  type Lang,
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
const forestFdnIt = aPrint({
  id: 'forest-fdn-it',
  set: 'fdn',
  lang: 'it',
  releasedAt: '2024-11-15',
});
const forestM21ItLowres = aPrint({
  id: 'forest-m21-it-lowres',
  set: 'm21',
  lang: 'it',
  releasedAt: '2020-07-03',
  imageStatus: 'lowres',
});

function resolved(line: DecklistLine | undefined): ResolvedLine {
  if (line?.status !== 'resolved') throw new Error('expected a resolved line');
  return line;
}

async function forestLine(quantity: number, lang: Lang = 'en', prints = catalog) {
  const [line] = await resolveDecklist(`${quantity} Forest`, prints, { today, lang });
  return resolved(line);
}

/** The line with `copies` more of its copies moved onto `print`. */
function withCopiesOn(line: ResolvedLine, print: typeof forestM21, copies: number): ResolvedLine {
  return resolved(applyAllocationChoice(line, allocatePrintCopies(line, print, copies)));
}

/** The tiles as (print id, warning) pairs. */
function warningsById(line: ResolvedLine) {
  return printTiles(line).map(({ print, warning }) => [print.id, warning]);
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
      ['forest-fdn', 5],
      ['forest-m21', 3],
      ['forest-znr', 2],
    ]);
  });

  it('gives the default print one tile when the user also allocated copies to it', async () => {
    const line = withCopiesOn(withCopiesOn(await forestLine(4), forestM21, 1), forestFdn, 2);

    expect(tilesById(line)).toEqual([
      ['forest-fdn', 3],
      ['forest-m21', 1],
    ]);
  });

  it('drops the default print tile once every copy is allocated elsewhere', async () => {
    const line = withCopiesOn(await forestLine(3), forestM21, 3);

    expect(tilesById(line)).toEqual([['forest-m21', 3]]);
  });

  it("puts the default print tile first, then the other prints in the order of the line's allocations", async () => {
    const line = withCopiesOn(withCopiesOn(await forestLine(6), forestZnr, 1), forestM21, 1);

    expect(tilesById(line)).toEqual([
      ['forest-fdn', 4],
      ['forest-znr', 1],
      ['forest-m21', 1],
    ]);
  });

  it('warns only on the tile whose own print has a low-resolution image', async () => {
    const italian = createInMemoryCatalog([
      { card: forest, prints: [forestFdn, forestFdnIt, forestM21ItLowres] },
    ]);
    const line = withCopiesOn(await forestLine(4, 'it', italian), forestM21ItLowres, 1);

    expect(warningsById(line)).toEqual([
      ['forest-fdn-it', null],
      ['forest-m21-it-lowres', 'lowResolution'],
    ]);
  });

  it('warns on the tile of an Italian line that prints in English for want of an Italian image', async () => {
    expect(warningsById(await forestLine(2, 'it'))).toEqual([['forest-fdn', 'languageFallback']]);
  });

  it('never warns on the tile of an English print the user chose for an Italian line', async () => {
    const italian = createInMemoryCatalog([{ card: forest, prints: [forestFdn, forestFdnIt] }]);
    const line = withCopiesOn(await forestLine(4, 'it', italian), forestFdn, 1);

    expect(warningsById(line)).toEqual([
      ['forest-fdn-it', null],
      ['forest-fdn', null],
    ]);
  });

  it('gives a line with no printable print no tile', async () => {
    const noPrint = { ...(await forestLine(2)), defaultPrint: null };

    expect(printTiles(noPrint)).toEqual([]);
  });
});
