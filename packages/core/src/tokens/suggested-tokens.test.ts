import { describe, expect, it } from 'vitest';
import {
  createInMemoryCatalog,
  tokenQueryLineOf,
  resolveDecklist,
  suggestTokens,
  tokenCreatorNamesOf,
  type CatalogEntry,
  type TokenLink,
} from '../index.ts';
import { aCard, aPrint } from '../test-support/test-fixtures.ts';

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

  it("takes the token's default print when the print a card names is not out yet", async () => {
    const previewed = {
      ...treasure,
      prints: [
        aPrint({
          id: 'treasure-next',
          set: 'tnxt',
          collectorNumber: '1',
          releasedAt: '2027-01-01',
        }),
        aPrint({ id: 'treasure-old', set: 'told', collectorNumber: '7', releasedAt: '2010-01-01' }),
      ],
    };

    const suggested = await suggestFor(
      [goldForger, previewed],
      [{ creatorPrintId: 'gold-forger-tst', tokenPrintId: 'treasure-next' }],
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

describe('tokenQueryLineOf', () => {
  it('tells the card of a resolved line and the print its preview shows, and nothing of other lines', async () => {
    const lines = await resolveDecklist(
      'Gold Forger\nXyzzy Plover',
      createInMemoryCatalog([goldForger]),
      {
        lang: 'en',
        today,
      },
    );

    expect(lines.map(tokenQueryLineOf)).toEqual([
      { oracleId: 'gold-forger', previewPrintId: 'gold-forger-tst' },
      null,
    ]);
  });
});

describe('tokenCreatorNamesOf', () => {
  it('tells the cards of the decklist creating a suggested token, past the lines naming no card', async () => {
    const smotheringTithe = creator('smothering-tithe', 'Smothering Tithe');
    const catalog = createInMemoryCatalog(
      [goldForger, smotheringTithe, treasure],
      [
        { creatorPrintId: 'gold-forger-tst', tokenPrintId: 'treasure-tsnc' },
        { creatorPrintId: 'smothering-tithe-tst', tokenPrintId: 'treasure-tsnc' },
      ],
    );
    const lines = await resolveDecklist(
      'Xyzzy Plover\nGold Forger\nXyzzy Plover\nSmothering Tithe',
      catalog,
      { lang: 'en', today },
    );
    const suggested = await suggestTokens(
      catalog,
      lines.flatMap((line) => tokenQueryLineOf(line) ?? []),
      { lang: 'en', today },
    );

    expect(suggested.map((token) => tokenCreatorNamesOf(token, lines))).toEqual([
      ['Gold Forger', 'Smothering Tithe'],
    ]);
  });

  it('names a card creating the token as the print of its line reads it, in its language', async () => {
    const krenko = {
      card: aCard({ oracleId: 'krenko', name: 'Krenko, Mob Boss' }),
      prints: [
        aPrint({ id: 'krenko-en', printedName: 'Krenko, Mob Boss' }),
        aPrint({ id: 'krenko-it', lang: 'it', printedName: 'Krenko, Capocosca' }),
      ],
    };
    const catalog = createInMemoryCatalog(
      [krenko, treasure],
      [{ creatorPrintId: 'krenko-en', tokenPrintId: 'treasure-tsnc' }],
    );
    const lines = await resolveDecklist('Krenko, Mob Boss', catalog, { lang: 'it', today });
    const suggested = await suggestTokens(
      catalog,
      lines.flatMap((line) => tokenQueryLineOf(line) ?? []),
      { lang: 'it', today },
    );

    expect(suggested.map((token) => tokenCreatorNamesOf(token, lines))).toEqual([
      ['Krenko, Capocosca'],
    ]);
  });

  it('names a card creating the token once, though two lines hold it', async () => {
    const catalog = createInMemoryCatalog(
      [goldForger, treasure],
      [{ creatorPrintId: 'gold-forger-tst', tokenPrintId: 'treasure-tsnc' }],
    );
    const lines = await resolveDecklist('Gold Forger\nSideboard\nGold Forger', catalog, {
      lang: 'en',
      today,
    });
    const suggested = await suggestTokens(
      catalog,
      lines.flatMap((line) => tokenQueryLineOf(line) ?? []),
      { lang: 'en', today },
    );

    expect(suggested.map((token) => tokenCreatorNamesOf(token, lines))).toEqual([['Gold Forger']]);
  });
});
