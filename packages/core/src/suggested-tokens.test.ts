import { describe, expect, it } from 'vitest';
import {
  createInMemoryCatalog,
  lineCardOf,
  resolveDecklist,
  suggestTokens,
  type CatalogEntry,
  type TokenLink,
} from './index.ts';
import { aCard, aPrint } from './test-fixtures.ts';

const today = '2026-11-07';

/** A card of the decklist with one English print, `<oracleId>-tst`. */
function creator(oracleId: string, name: string): CatalogEntry {
  return {
    card: aCard({ oracleId, name }),
    prints: [aPrint({ id: `${oracleId}-tst`, printedName: name })],
  };
}

/** The suggestions for a decklist of the `creators`, each shown with its only print. */
function suggestFor(
  entries: readonly CatalogEntry[],
  links: readonly TokenLink[],
  creators: readonly string[],
  lang: 'en' | 'it' = 'en',
) {
  return suggestTokens(
    createInMemoryCatalog(entries, links),
    creators.map((oracleId) => ({ oracleId, previewPrintId: `${oracleId}-tst` })),
    { lang, today },
  );
}

/** The set and number each suggestion would be written with. */
const writtenPrints = (suggested: Awaited<ReturnType<typeof suggestFor>>) =>
  suggested.map(
    ({ candidate }) =>
      `${candidate.card.name} ${candidate.defaultPrint.set} ${candidate.defaultPrint.collectorNumber}`,
  );

const goldForger = {
  card: aCard({ oracleId: 'gold-forger', name: 'Gold Forger' }),
  prints: [aPrint({ id: 'gold-forger-tst', printedName: 'Gold Forger' })],
};
const treasure = {
  card: aCard({ oracleId: 'treasure', name: 'Treasure' }),
  prints: [
    aPrint({ id: 'treasure-tmkm', set: 'tmkm', collectorNumber: '12', layout: 'token' }),
    aPrint({ id: 'treasure-tsnc', set: 'tsnc', collectorNumber: '16', layout: 'token' }),
  ],
};

describe('suggestTokens', () => {
  it('suggests the token a card of the decklist creates, at the print its all_parts names', async () => {
    const catalog = createInMemoryCatalog(
      [goldForger, treasure],
      [{ creatorPrintId: 'gold-forger-tst', tokenPrintId: 'treasure-tsnc' }],
    );

    const suggested = await suggestTokens(
      catalog,
      [{ oracleId: 'gold-forger', previewPrintId: 'gold-forger-tst' }],
      { lang: 'en', today },
    );

    expect(suggested).toEqual([
      {
        candidate: { card: treasure.card, defaultPrint: treasure.prints[1], printWarning: null },
        lang: 'en',
        createdBy: [0],
      },
    ]);
  });

  it('suggests one token however many cards create it, naming every card that does', async () => {
    const forgers = ['gold-forger', 'smothering-tithe', 'dockside'].map((id) => creator(id, id));
    const links = forgers.map(({ card }) => ({
      creatorPrintId: `${card.oracleId}-tst`,
      tokenPrintId: 'treasure-tsnc',
    }));

    const suggested = await suggestFor(
      [...forgers, treasure],
      links,
      forgers.map((f) => f.card.oracleId),
    );

    expect(suggested).toHaveLength(1);
    expect(suggested[0]).toMatchObject({
      candidate: { card: treasure.card },
      createdBy: [0, 1, 2],
    });
  });

  it('suggests tokens sharing a name apart, each at its own set and number', async () => {
    const soldier11 = {
      card: aCard({ oracleId: 'soldier-1-1', name: 'Soldier' }),
      prints: [
        aPrint({ id: 'soldier-1-1-tdom', set: 'tdom', collectorNumber: '2', layout: 'token' }),
      ],
    };
    const soldier22 = {
      card: aCard({ oracleId: 'soldier-2-2', name: 'Soldier' }),
      prints: [
        aPrint({ id: 'soldier-2-2-twar', set: 'twar', collectorNumber: '3', layout: 'token' }),
      ],
    };
    const raise = creator('raise-the-alarm', 'Raise the Alarm');
    const captain = creator('captain', 'Captain');

    const suggested = await suggestFor(
      [raise, captain, soldier11, soldier22],
      [
        { creatorPrintId: 'raise-the-alarm-tst', tokenPrintId: 'soldier-1-1-tdom' },
        { creatorPrintId: 'captain-tst', tokenPrintId: 'soldier-2-2-twar' },
      ],
      ['raise-the-alarm', 'captain'],
    );

    expect(writtenPrints(suggested)).toEqual(['Soldier tdom 2', 'Soldier twar 3']);
  });

  it('takes the token print the first card creating it names', async () => {
    const first = creator('first', 'First');
    const second = creator('second', 'Second');

    const suggested = await suggestFor(
      [first, second, treasure],
      [
        { creatorPrintId: 'second-tst', tokenPrintId: 'treasure-tsnc' },
        { creatorPrintId: 'first-tst', tokenPrintId: 'treasure-tmkm' },
      ],
      ['first', 'second'],
    );

    expect(writtenPrints(suggested)).toEqual(['Treasure tmkm 12']);
  });

  it("takes the token's default print when the print a card names has no scan", async () => {
    const unscanned = {
      ...treasure,
      prints: [
        aPrint({ id: 'treasure-new', set: 'tnew', collectorNumber: '1', imageStatus: 'missing' }),
        aPrint({ id: 'treasure-old', set: 'told', collectorNumber: '7', releasedAt: '2010-01-01' }),
      ],
    };

    const suggested = await suggestFor(
      [goldForger, unscanned],
      [{ creatorPrintId: 'gold-forger-tst', tokenPrintId: 'treasure-new' }],
      ['gold-forger'],
    );

    expect(writtenPrints(suggested)).toEqual(['Treasure told 7']);
  });

  it('suggests the token in the default language, falling back to English as lines do', async () => {
    const italianTreasure = aPrint({
      id: 'treasure-tsnc-it',
      set: 'tsnc',
      collectorNumber: '16',
      lang: 'it',
      printedName: 'Tesoro',
    });
    const zombie = {
      card: aCard({ oracleId: 'zombie', name: 'Zombie' }),
      prints: [aPrint({ id: 'zombie-tdom', set: 'tdom', collectorNumber: '5' })],
    };
    const raiser = creator('raiser', 'Raiser');

    const suggested = await suggestFor(
      [goldForger, raiser, { ...treasure, prints: [...treasure.prints, italianTreasure] }, zombie],
      [
        { creatorPrintId: 'gold-forger-tst', tokenPrintId: 'treasure-tsnc' },
        { creatorPrintId: 'raiser-tst', tokenPrintId: 'zombie-tdom' },
      ],
      ['gold-forger', 'raiser'],
      'it',
    );

    expect(suggested.map(({ candidate, lang }) => [candidate.defaultPrint.id, lang])).toEqual([
      ['treasure-tsnc-it', 'it'],
      ['zombie-tdom', 'en'],
    ]);
  });

  it('never suggests a token a resolved line of the decklist already is, in any print', async () => {
    const suggested = await suggestTokens(
      createInMemoryCatalog(
        [goldForger, treasure],
        [{ creatorPrintId: 'gold-forger-tst', tokenPrintId: 'treasure-tsnc' }],
      ),
      [
        { oracleId: 'gold-forger', previewPrintId: 'gold-forger-tst' },
        { oracleId: 'treasure', previewPrintId: 'treasure-tmkm' },
      ],
      { lang: 'en', today },
    );

    expect(suggested).toEqual([]);
  });
});

describe('lineCardOf', () => {
  it('tells the card of a resolved line and the print its preview shows, and nothing of other lines', async () => {
    const lines = await resolveDecklist(
      'Gold Forger\nXyzzy Plover',
      createInMemoryCatalog([goldForger]),
      {
        lang: 'en',
        today,
      },
    );

    expect(lines.map(lineCardOf)).toEqual([
      { oracleId: 'gold-forger', previewPrintId: 'gold-forger-tst' },
      null,
    ]);
  });
});
