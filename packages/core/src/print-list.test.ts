import { describe, expect, it } from 'vitest';
import { createInMemoryCatalog, isPrintCursor, listPrints } from './index.ts';
import { aCard, aPrint } from './test-fixtures.ts';

/** Fixed "today": prints released later are not out yet. */
const today = '2026-11-07';
const forest = aCard({ oracleId: 'forest', name: 'Forest' });

describe('listPrints', () => {
  it('lists the printable prints of a card in the asked language, newest first', async () => {
    const catalog = createInMemoryCatalog([
      {
        card: forest,
        prints: [
          aPrint({ id: 'forest-2019-it', lang: 'it', releasedAt: '2019-05-03' }),
          aPrint({ id: 'forest-2024-it', lang: 'it', releasedAt: '2024-02-09' }),
          aPrint({ id: 'forest-2024-en', lang: 'en', releasedAt: '2024-02-09' }),
          aPrint({ id: 'forest-2021-it', lang: 'it', releasedAt: '2021-09-24' }),
          aPrint({ id: 'forest-mtgo-it', lang: 'it', releasedAt: '2025-01-01', digital: true }),
          aPrint({
            id: 'forest-art-it',
            lang: 'it',
            releasedAt: '2025-01-01',
            layout: 'art_series',
          }),
          aPrint({ id: 'forest-placeholder-it', lang: 'it', imageStatus: 'placeholder' }),
          aPrint({ id: 'forest-preview-it', lang: 'it', releasedAt: '2027-01-01' }),
        ],
      },
    ]);

    const page = await listPrints(catalog, { oracleId: 'forest', lang: 'it', today, limit: 10 });

    expect(page?.prints.map((print) => print.id)).toEqual([
      'forest-2024-it',
      'forest-2021-it',
      'forest-2019-it',
    ]);
    expect(page?.total).toBe(3);
    expect(page?.nextCursor).toBeNull();
  });

  it('pages through every print once, in collector number order within a release day', async () => {
    const basicLand = (collectorNumber: string) =>
      aPrint({
        id: `forest-${collectorNumber}`,
        set: 'fdn',
        collectorNumber,
        releasedAt: '2024-11-15',
      });
    const catalog = createInMemoryCatalog([
      {
        card: forest,
        prints: [
          basicLand('280'),
          aPrint({ id: 'forest-old', releasedAt: '1993-08-05' }),
          basicLand('9'),
          basicLand('281'),
          basicLand('10'),
        ],
      },
    ]);
    const options = { oracleId: 'forest', lang: 'en', today, limit: 2 } as const;

    const first = await listPrints(catalog, options);
    const second = await listPrints(catalog, { ...options, cursor: first?.nextCursor });
    const third = await listPrints(catalog, { ...options, cursor: second?.nextCursor });

    expect([first, second, third].map((page) => page?.prints.map((print) => print.id))).toEqual([
      ['forest-9', 'forest-10'],
      ['forest-280', 'forest-281'],
      ['forest-old'],
    ]);
    expect([first, second, third].map((page) => page?.total)).toEqual([5, 5, 5]);
    expect(third?.nextCursor).toBeNull();
  });

  it('resumes after the last print shown even when the catalog changed in between', async () => {
    const prints = ['2024', '2023', '2022', '2021'].map((year) =>
      aPrint({ id: `forest-${year}`, releasedAt: `${year}-01-01` }),
    );
    const options = { oracleId: 'forest', lang: 'en', today, limit: 2 } as const;
    const first = await listPrints(createInMemoryCatalog([{ card: forest, prints }]), options);

    const withoutLastShown = prints.filter((print) => print.id !== 'forest-2023');
    const second = await listPrints(
      createInMemoryCatalog([{ card: forest, prints: withoutLastShown }]),
      { ...options, cursor: first?.nextCursor },
    );

    expect(second?.prints.map((print) => print.id)).toEqual(['forest-2022', 'forest-2021']);
  });

  it('lists the English prints when no Italian one is printable, as the line falls back to them', async () => {
    const catalog = createInMemoryCatalog([
      {
        card: forest,
        prints: [
          aPrint({ id: 'forest-it-placeholder', lang: 'it', imageStatus: 'placeholder' }),
          aPrint({ id: 'forest-en', lang: 'en' }),
        ],
      },
    ]);

    const page = await listPrints(catalog, { oracleId: 'forest', lang: 'it', today, limit: 2 });

    expect(page?.prints.map((print) => print.id)).toEqual(['forest-en']);
    expect(page?.total).toBe(1);
  });

  it('is null for a card the catalog does not hold', async () => {
    const page = await listPrints(createInMemoryCatalog([]), {
      oracleId: 'forest',
      lang: 'en',
      today,
      limit: 2,
    });

    expect(page).toBeNull();
  });
});

describe('isPrintCursor', () => {
  it('accepts the cursors listPrints hands out and nothing else', async () => {
    const catalog = createInMemoryCatalog([
      { card: forest, prints: [aPrint({ id: 'a' }), aPrint({ id: 'b' })] },
    ]);
    const page = await listPrints(catalog, { oracleId: 'forest', lang: 'en', today, limit: 1 });

    expect(isPrintCursor(page?.nextCursor)).toBe(true);
    expect(isPrintCursor('not-a-cursor')).toBe(false);
    expect(isPrintCursor('')).toBe(false);
    expect(isPrintCursor(42)).toBe(false);
  });
});
