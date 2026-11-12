import { describe, expect, it } from 'vitest';
import {
  allocateEveryCopy,
  allocatePrintCopies,
  applyAllocationChoice,
  copiesAllocatedTo,
  copiesByPrint,
  fitAllocations,
  previewPrint,
  createInMemoryCatalog,
  resolveDecklist,
  unallocatedCopies,
  type DecklistLine,
  type ResolvedLine,
} from './index.ts';
import { aCard, aPrint } from './test-fixtures.ts';

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

describe('allocateEveryCopy', () => {
  it('prints every copy of the line with one print, replacing the allocations it had', async () => {
    const line = await forestLine(4);
    const threeM21 = resolved(applyAllocationChoice(line, allocatePrintCopies(line, forestM21, 3)));

    expect(allocateEveryCopy(threeM21, forestZnr).allocations).toMatchObject([
      { print: { id: 'forest-znr' }, quantity: 4 },
    ]);
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

    expect(applyAllocationChoice(line, allocateEveryCopy(line, solRingItOld))).toMatchObject({
      printWarning: null,
    });
    expect(applyAllocationChoice(line, allocatePrintCopies(line, solRingItOld, 3))).toMatchObject({
      printWarning: 'lowResolution',
    });
  });

  it('keeps warning that an Italian line prints in English when its copies use English prints', async () => {
    const english2016 = aPrint({ id: 'sol-ring-en-2016', releasedAt: '2016-01-01' });
    const englishOnly = createInMemoryCatalog([
      { card: solRing, prints: [solRingC21, english2016] },
    ]);
    const line = resolved(
      (await resolveDecklist('4 Sol Ring', englishOnly, { today, lang: 'it' }))[0],
    );

    expect(applyAllocationChoice(line, allocateEveryCopy(line, english2016))).toMatchObject({
      lang: 'it',
      printWarning: 'languageFallback',
      allocations: [{ print: { id: 'sol-ring-en-2016' }, quantity: 4 }],
    });
  });

  it('never prints more copies than the line asks for', async () => {
    const line = await solRingLine('it');
    const fourOld = allocateEveryCopy(line, solRingItOld);

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
    const oldItalian = allocateEveryCopy(italian, solRingItOld);

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
