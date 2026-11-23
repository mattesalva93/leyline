import { describe, expect, it } from 'vitest';
import {
  allocatePrintCopies,
  applyAllocationChoice,
  copiesAllocatedTo,
  copiesByPrint,
  fitAllocations,
  moveEveryCopy,
  moveTileCopies,
  previewPrint,
  printTiles,
  createInMemoryCatalog,
  resolveDecklist,
  unallocatedCopies,
  type DecklistLine,
  type Print,
  type ResolvedLine,
} from '../index.ts';
import { aCard, aPrint } from '../test-support/test-fixtures.ts';

/** Fixed "today" for the default print rule: prints released later are not out yet. */
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

/** `line` with `copies` of its copies allocated to `print`. */
function allocated(line: ResolvedLine, print: Print, copies: number): ResolvedLine {
  return resolved(applyAllocationChoice(line, allocatePrintCopies(line, print, copies)));
}

/** The line's allocations as (print id, quantity) pairs. */
function allocationsById(line: ResolvedLine) {
  return line.allocations.map(({ print, quantity }) => [print.id, quantity]);
}

describe('allocatePrintCopies', () => {
  it('splits a line between prints, the copies left over staying with the default print', async () => {
    const line = await forestLine(20);

    const sevenM21 = applyAllocationChoice(line, allocatePrintCopies(line, forestM21, 7));
    const sixZnr = applyAllocationChoice(
      line,
      allocatePrintCopies(resolved(sevenM21), forestZnr, 6),
    );

    expect(allocationsById(resolved(sixZnr))).toEqual([
      ['forest-m21', 7],
      ['forest-znr', 6],
    ]);
    expect(sixZnr).toMatchObject({ quantity: 20, defaultPrint: { id: 'forest-fdn' } });
    expect(previewPrint(sixZnr)?.id).toBe('forest-m21');
  });

  it('never allocates more copies than the line prints', async () => {
    const line = await forestLine(4);
    const threeM21 = resolved(applyAllocationChoice(line, allocatePrintCopies(line, forestM21, 3)));

    expect(allocatePrintCopies(threeM21, forestZnr, 5).allocations).toMatchObject([
      { print: { id: 'forest-m21' }, quantity: 3 },
      { print: { id: 'forest-znr' }, quantity: 1 },
    ]);
    expect(allocatePrintCopies(line, forestM21, 9).allocations).toMatchObject([
      { print: { id: 'forest-m21' }, quantity: 4 },
    ]);
  });

  it('drops a print brought down to no copies, giving them back to the default print', async () => {
    const line = await forestLine(4);
    const threeM21 = resolved(applyAllocationChoice(line, allocatePrintCopies(line, forestM21, 3)));

    expect(allocatePrintCopies(threeM21, forestM21, 0).allocations).toEqual([]);
  });
});

describe('fitAllocations', () => {
  /** 20 Forest: 7 M21, then 6 ZNR, the 7 left with the default print. */
  async function twentyForests() {
    const line = await forestLine(20);
    const sevenM21 = resolved(applyAllocationChoice(line, allocatePrintCopies(line, forestM21, 7)));
    return allocatePrintCopies(sevenM21, forestZnr, 6);
  }

  it('takes copies off the default print first', async () => {
    expect(fitAllocations(await twentyForests(), 15).allocations).toMatchObject([
      { print: { id: 'forest-m21' }, quantity: 7 },
      { print: { id: 'forest-znr' }, quantity: 6 },
    ]);
  });

  it('then takes copies off the allocations, the most recently changed first', async () => {
    const choice = await twentyForests();

    expect(fitAllocations(choice, 10).allocations).toMatchObject([
      { print: { id: 'forest-m21' }, quantity: 7 },
      { print: { id: 'forest-znr' }, quantity: 3 },
    ]);
    expect(fitAllocations(choice, 5).allocations).toMatchObject([
      { print: { id: 'forest-m21' }, quantity: 5 },
    ]);
  });

  it('counts a print as changed again whenever its copies change', async () => {
    const line = await forestLine(20);
    const choice = await twentyForests();
    const eightM21 = allocatePrintCopies(
      resolved(applyAllocationChoice(line, choice)),
      forestM21,
      8,
    );

    expect(fitAllocations(eightM21, 10).allocations).toMatchObject([
      { print: { id: 'forest-znr' }, quantity: 6 },
      { print: { id: 'forest-m21' }, quantity: 4 },
    ]);
  });
});

describe('moveTileCopies', () => {
  const forestNeo = aPrint({ id: 'forest-neo', set: 'neo', releasedAt: '2022-02-18' });

  /** 4 Forest split 2 + 1 + 1: two M21, one ZNR, one left with the default print FDN. */
  async function forestSplitTwoOneOne(): Promise<ResolvedLine> {
    return allocated(allocated(await forestLine(4), forestM21, 2), forestZnr, 1);
  }

  /** The line's tiles as (print id, copies) pairs, in the order they print. */
  function tilesOf(line: DecklistLine) {
    return copiesByPrint(resolved(line)).map(({ print, quantity }) => [print.id, quantity]);
  }

  it('moves the copies of one tile onto the tapped print, the other tiles left as they are', async () => {
    const line = await forestSplitTwoOneOne();

    expect(
      tilesOf(applyAllocationChoice(line, moveTileCopies(line, forestZnr, forestNeo))),
    ).toEqual([
      ['forest-m21', 2],
      ['forest-neo', 1],
      ['forest-fdn', 1],
    ]);
  });

  it('leaves the tile where it stood among its siblings, whichever it is', async () => {
    const line = await forestSplitTwoOneOne();

    expect(
      tilesOf(applyAllocationChoice(line, moveTileCopies(line, forestM21, forestNeo))),
    ).toEqual([
      ['forest-neo', 2],
      ['forest-znr', 1],
      ['forest-fdn', 1],
    ]);
  });

  it('takes the place of the tile in the order the line loses copies in, too', async () => {
    const line = await forestSplitTwoOneOne();
    const moved = moveTileCopies(line, forestM21, forestNeo);

    expect(fitAllocations(moved, 2).allocations).toMatchObject([
      { print: { id: 'forest-neo' }, quantity: 2 },
    ]);
  });

  it('joins the tile of the tapped print when it already has one, adding up their copies', async () => {
    const line = await forestSplitTwoOneOne();

    const joined = resolved(
      applyAllocationChoice(line, moveTileCopies(line, forestZnr, forestM21)),
    );

    expect(tilesOf(joined)).toEqual([
      ['forest-m21', 3],
      ['forest-fdn', 1],
    ]);
    expect(copiesAllocatedTo(joined, forestM21)).toBe(3);
  });

  it('changes nothing when the tapped print is the one of the tile', async () => {
    const line = await forestSplitTwoOneOne();

    expect(
      tilesOf(applyAllocationChoice(line, moveTileCopies(line, forestZnr, forestZnr))),
    ).toEqual([
      ['forest-m21', 2],
      ['forest-znr', 1],
      ['forest-fdn', 1],
    ]);
  });

  it('moves every copy of a line that has a single tile', async () => {
    const line = await forestLine(4);

    expect(
      tilesOf(applyAllocationChoice(line, moveTileCopies(line, forestFdn, forestNeo))),
    ).toEqual([['forest-neo', 4]]);
  });

  it('moves the copies left with the default print too, along with its tile', async () => {
    // 5 Forest: two M21, one ZNR, and an FDN tile of two: one allocated to FDN, one left with it.
    const five = await forestLine(5);
    const twoM21 = allocated(five, forestM21, 2);
    const oneZnr = allocated(twoM21, forestZnr, 1);
    const line = allocated(oneZnr, forestFdn, 1);

    expect(
      tilesOf(applyAllocationChoice(line, moveTileCopies(line, forestFdn, forestNeo))),
    ).toEqual([
      ['forest-neo', 2],
      ['forest-m21', 2],
      ['forest-znr', 1],
    ]);
  });

  it('leaves the tile of the default print first, where the grid shows it', async () => {
    const line = await forestSplitTwoOneOne();

    const moved = resolved(applyAllocationChoice(line, moveTileCopies(line, forestFdn, forestNeo)));

    expect(printTiles(moved).map(({ print, quantity }) => [print.id, quantity])).toEqual([
      ['forest-neo', 1],
      ['forest-m21', 2],
      ['forest-znr', 1],
    ]);
  });

  it('leaves the tile of the default print first when it joins another tile', async () => {
    const line = await forestSplitTwoOneOne();

    const joined = resolved(
      applyAllocationChoice(line, moveTileCopies(line, forestFdn, forestZnr)),
    );

    expect(printTiles(joined).map(({ print, quantity }) => [print.id, quantity])).toEqual([
      ['forest-znr', 2],
      ['forest-m21', 2],
    ]);
  });
});

describe('moveEveryCopy', () => {
  it('moves every copy of the line onto one print, whatever tiles it had', async () => {
    const line = await forestLine(4);
    const split = allocated(allocated(line, forestM21, 2), forestZnr, 1);

    expect(
      copiesByPrint(resolved(applyAllocationChoice(split, moveEveryCopy(split, forestZnr)))),
    ).toMatchObject([{ print: { id: 'forest-znr' }, quantity: 4 }]);
  });
});

describe('applyAllocationChoice', () => {
  const solRing = aCard({ oracleId: 'sol-ring', name: 'Sol Ring' });
  const solRingC21 = aPrint({ id: 'sol-ring-c21', releasedAt: '2021-04-23' });
  const solRingIt = aPrint({ id: 'sol-ring-it', lang: 'it', releasedAt: '2025-01-01' });
  const solRingItOld = aPrint({ id: 'sol-ring-it-old', lang: 'it', releasedAt: '2016-01-01' });
  const solRingItLowres = aPrint({ id: 'sol-ring-it-lowres', lang: 'it', imageStatus: 'lowres' });
  const solRingCatalog = createInMemoryCatalog([
    { card: solRing, prints: [solRingC21, solRingIt, solRingItOld, solRingItLowres] },
  ]);
  async function solRingLine(lang: 'it' | 'en') {
    const [line] = await resolveDecklist('4 Sol Ring', solRingCatalog, { today, lang });
    return resolved(line);
  }

  it('keeps the default print the copies left over use', async () => {
    const line = await solRingLine('it');

    expect(applyAllocationChoice(line, allocatePrintCopies(line, solRingItOld, 1))).toMatchObject({
      defaultPrint: { id: 'sol-ring-it' },
      allocations: [{ print: { id: 'sol-ring-it-old' }, quantity: 1 }],
    });
  });

  it('warns about a low-resolution print any copy uses, as English could replace it', async () => {
    const line = await solRingLine('it');

    expect(
      applyAllocationChoice(line, allocatePrintCopies(line, solRingItLowres, 1)),
    ).toMatchObject({ printWarning: 'lowResolution' });
  });

  it('stops warning once no copy uses the low-resolution print', async () => {
    const lowresNewest = aPrint({
      id: 'sol-ring-it-2025-lowres',
      lang: 'it',
      releasedAt: '2025-01-01',
      imageStatus: 'lowres',
    });
    const lowresDefault = createInMemoryCatalog([
      { card: solRing, prints: [solRingC21, lowresNewest, solRingItOld] },
    ]);
    const line = resolved(
      (await resolveDecklist('4 Sol Ring', lowresDefault, { today, lang: 'it' }))[0],
    );

    expect(applyAllocationChoice(line, moveEveryCopy(line, solRingItOld))).toMatchObject({
      printWarning: null,
    });
    expect(applyAllocationChoice(line, allocatePrintCopies(line, solRingItOld, 3))).toMatchObject({
      printWarning: 'lowResolution',
    });
  });

  it('never warns about an English print the user chose for copies of an Italian line', async () => {
    const line = await solRingLine('it');

    expect(applyAllocationChoice(line, moveEveryCopy(line, solRingC21))).toMatchObject({
      lang: 'it',
      printWarning: null,
    });
  });

  /** 4 Sol Ring in Italian, from a catalog with English prints only. */
  async function italianLineWithEnglishOnly() {
    const english2016 = aPrint({ id: 'sol-ring-en-2016', releasedAt: '2016-01-01' });
    const englishOnly = createInMemoryCatalog([
      { card: solRing, prints: [solRingC21, english2016] },
    ]);
    const [line] = await resolveDecklist('4 Sol Ring', englishOnly, { today, lang: 'it' });
    return { line: resolved(line), english2016 };
  }

  it('warns that an Italian line prints in English while copies stay on the English print standing in', async () => {
    const { line, english2016 } = await italianLineWithEnglishOnly();

    expect(applyAllocationChoice(line, allocatePrintCopies(line, english2016, 3))).toMatchObject({
      lang: 'it',
      printWarning: 'languageFallback',
    });
  });

  it('stops warning once every copy leaves the English print standing in', async () => {
    const { line, english2016 } = await italianLineWithEnglishOnly();

    expect(applyAllocationChoice(line, moveEveryCopy(line, english2016))).toMatchObject({
      lang: 'it',
      printWarning: null,
    });
  });

  it('never prints more copies than the line asks for', async () => {
    const line = await solRingLine('it');
    const fourOld = moveEveryCopy(line, solRingItOld);

    expect(applyAllocationChoice({ ...line, quantity: 3 }, fourOld)).toMatchObject({
      allocations: [{ print: { id: 'sol-ring-it-old' }, quantity: 3 }],
    });
  });

  it('allocates copies of an Italian line to English prints, the rest staying Italian', async () => {
    const line = await solRingLine('it');

    expect(applyAllocationChoice(line, allocatePrintCopies(line, solRingC21, 1))).toMatchObject({
      lang: 'it',
      defaultPrint: { id: 'sol-ring-it' },
      allocations: [{ print: { id: 'sol-ring-c21' }, quantity: 1 }],
    });
  });

  it('keeps the allocated copies where they are once the line changes language', async () => {
    const italian = await solRingLine('it');
    const english = await solRingLine('en');
    const oneOldItalian = allocatePrintCopies(italian, solRingItOld, 1);

    expect(applyAllocationChoice(english, oneOldItalian)).toMatchObject({
      lang: 'en',
      defaultPrint: { id: 'sol-ring-c21' },
      allocations: [{ print: { id: 'sol-ring-it-old' }, quantity: 1 }],
    });
  });

  it('leaves the line as it is once it resolves to another card than the choice', async () => {
    const italian = await solRingLine('it');
    const oldItalian = moveEveryCopy(italian, solRingItOld);

    expect(applyAllocationChoice(italian, { ...oldItalian, oracleId: 'goblin' })).toBe(italian);
  });
});

describe('copiesByPrint', () => {
  it('counts the copies of each print in the order they print, the default print last', async () => {
    const line = await forestLine(20);
    const sevenM21 = resolved(applyAllocationChoice(line, allocatePrintCopies(line, forestM21, 7)));
    const sixZnr = resolved(
      applyAllocationChoice(line, allocatePrintCopies(sevenM21, forestZnr, 6)),
    );

    expect(unallocatedCopies(sixZnr)).toBe(7);
    expect(copiesByPrint(sixZnr).map(({ print, quantity }) => [print.id, quantity])).toEqual([
      ['forest-m21', 7],
      ['forest-znr', 6],
      ['forest-fdn', 7],
    ]);
  });

  it('counts the copies allocated to the default print with the ones left to it', async () => {
    const line = await forestLine(4);
    const oneFdn = resolved(applyAllocationChoice(line, allocatePrintCopies(line, forestFdn, 1)));

    expect(copiesAllocatedTo(oneFdn, forestFdn)).toBe(1);
    expect(unallocatedCopies(oneFdn)).toBe(3);
    expect(copiesByPrint(oneFdn).map(({ print, quantity }) => [print.id, quantity])).toEqual([
      ['forest-fdn', 4],
    ]);
  });
});
