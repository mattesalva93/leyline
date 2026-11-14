import { describe, expect, it } from 'vitest';
import {
  countPrintsByLang,
  createInMemoryCatalog,
  isPrintCursor,
  langWithPrints,
  listPrints,
  resolveDecklist,
} from './index.ts';
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

  it('lists first the print a line of the card defaults to, even among prints of one day', async () => {
    const sameDay = ['281', '9', '10'].map((collectorNumber) =>
      aPrint({ id: `forest-${collectorNumber}`, collectorNumber, releasedAt: '2024-11-15' }),
    );
    const catalog = createInMemoryCatalog([{ card: forest, prints: sameDay }]);

    const page = await listPrints(catalog, { oracleId: 'forest', lang: 'en', today, limit: 3 });
    const [line] = await resolveDecklist('1 Forest', catalog, { today, lang: 'en' });

    expect(page?.prints[0]?.id).toBe('forest-9');
    expect(line).toMatchObject({ defaultPrint: { id: 'forest-9' } });
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

describe('listPrints with a print query', () => {
  /** The faces of a plain print, drawn by `artist`. */
  const facesBy = (artist: string) => aPrint().faces.map((face) => ({ ...face, artist }));

  /** The ids of the prints of a Forest with `prints` that `query` finds, in English. */
  async function idsFound(prints: Parameters<typeof aPrint>[0][], query: string) {
    const catalog = createInMemoryCatalog([{ card: forest, prints: prints.map(aPrint) }]);
    const page = await listPrints(catalog, {
      oracleId: 'forest',
      lang: 'en',
      today,
      limit: 10,
      query,
    });
    return page?.prints.map((print) => print.id);
  }

  it('finds only the prints every word of the query matches', async () => {
    const found = await idsFound(
      [
        { id: 'mh2-267', set: 'mh2', collectorNumber: '267' },
        { id: 'mh2-268', set: 'mh2', collectorNumber: '268' },
        { id: 'm21-267', set: 'm21', collectorNumber: '267' },
      ],
      'mh2 267',
    );

    expect(found).toEqual(['mh2-267']);
  });

  it.each([
    ['the set', 'MH2', { set: 'mh2' }],
    ['a word of the set name', 'hor', { setName: 'Modern Horizons 2' }],
    ['the start of the collector number', '26', { collectorNumber: '267' }],
    ['the release year', '2003', { releasedAt: '2003-07-28' }],
    [
      'the artist of the back face',
      'guay',
      { faces: [...facesBy('Kev Walker'), ...facesBy('Rebecca Guay')] },
    ],
    ['a promo type', 'prere', { promoTypes: ['prerelease'] }],
    ['an accented artist, typed without accents', 'tomas', { faces: facesBy('Tomás Giorello') }],
  ])('finds a print by %s alone', async (_field, query, fields) => {
    const found = await idsFound([{ ...fields, id: 'match' }, { id: 'other' }], query);

    expect(found).toEqual(['match']);
  });

  it('leaves out a print one word misses, even when the others match', async () => {
    const found = await idsFound([{ set: '8ed', releasedAt: '2003-07-28' }], '2003 9ed');

    expect(found).toEqual([]);
  });

  it('never matches a word in the middle of a field', async () => {
    const found = await idsFound([{ set: 'mh2', collectorNumber: '267' }], 'h2');

    expect(found).toEqual([]);
  });

  it('keeps every print for a query of nothing but spaces', async () => {
    const found = await idsFound([{ id: 'a' }, { id: 'b' }], '   ');

    expect(found).toEqual(['a', 'b']);
  });

  it('pages through the matching prints once, counting only them', async () => {
    const prints = ['2024', '2023', '2022', '2021', '2020'].map((year) =>
      aPrint({
        id: `forest-${year}`,
        releasedAt: `${year}-01-01`,
        set: year === '2022' ? 'xyz' : 'fdn',
      }),
    );
    const catalog = createInMemoryCatalog([{ card: forest, prints }]);
    const options = { oracleId: 'forest', lang: 'en', today, limit: 2, query: 'fdn' } as const;

    const first = await listPrints(catalog, options);
    const second = await listPrints(catalog, { ...options, cursor: first?.nextCursor });

    expect([first, second].map((page) => page?.prints.map((print) => print.id))).toEqual([
      ['forest-2024', 'forest-2023'],
      ['forest-2021', 'forest-2020'],
    ]);
    expect([first, second].map((page) => page?.total)).toEqual([4, 4]);
    expect(second?.nextCursor).toBeNull();
  });

  it('searches the English prints when no Italian one is printable', async () => {
    const catalog = createInMemoryCatalog([
      {
        card: forest,
        prints: [
          aPrint({
            id: 'forest-it-placeholder',
            lang: 'it',
            set: 'lea',
            imageStatus: 'placeholder',
          }),
          aPrint({ id: 'forest-en-lea', lang: 'en', set: 'lea' }),
          aPrint({ id: 'forest-en-fdn', lang: 'en', set: 'fdn' }),
        ],
      },
    ]);

    const page = await listPrints(catalog, {
      oracleId: 'forest',
      lang: 'it',
      today,
      limit: 10,
      query: 'lea',
    });

    expect(page?.prints.map((print) => print.id)).toEqual(['forest-en-lea']);
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

describe('countPrintsByLang', () => {
  it('counts the printable prints of each language, with no English stand-ins for Italian', async () => {
    const catalog = createInMemoryCatalog([
      {
        card: forest,
        prints: [
          aPrint({ id: 'forest-it-placeholder', lang: 'it', imageStatus: 'placeholder' }),
          aPrint({ id: 'forest-en-2024', lang: 'en', releasedAt: '2024-02-09' }),
          aPrint({ id: 'forest-en-2019', lang: 'en', releasedAt: '2019-05-03' }),
          aPrint({ id: 'forest-en-mtgo', lang: 'en', digital: true }),
          aPrint({ id: 'forest-en-preview', lang: 'en', releasedAt: '2027-01-01' }),
        ],
      },
    ]);

    expect(await countPrintsByLang(catalog, { oracleId: 'forest', today })).toEqual({
      it: 0,
      en: 2,
    });
  });

  it('is null for a card the catalog does not hold', async () => {
    const catalog = createInMemoryCatalog([]);

    expect(await countPrintsByLang(catalog, { oracleId: 'nope', today })).toBeNull();
  });
});

describe('langWithPrints', () => {
  it('keeps the asked language when the card has prints in it', () => {
    expect(langWithPrints('it', { it: 1, en: 8 })).toBe('it');
  });

  it('gives way to a language the card has prints in when the asked one has none', () => {
    expect(langWithPrints('it', { it: 0, en: 8 })).toBe('en');
  });

  it('keeps the asked language when no language has prints', () => {
    expect(langWithPrints('it', { it: 0, en: 0 })).toBe('it');
  });
});
