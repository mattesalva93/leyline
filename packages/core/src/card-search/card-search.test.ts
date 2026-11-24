import { describe, expect, it } from 'vitest';
import { createInMemoryCatalog, searchCards } from '../index.ts';
import { aCard, aPrint } from '../test-support/test-fixtures.ts';
import type { CatalogEntry } from '../types.ts';

function entry(oracleId: string, name: string, italianName = name): CatalogEntry {
  return {
    card: aCard({ oracleId, name }),
    prints: [
      aPrint({ id: `${oracleId}-en`, printedName: name }),
      aPrint({ id: `${oracleId}-it`, lang: 'it', printedName: italianName }),
    ],
  };
}

const catalog = createInMemoryCatalog([
  entry('bolt', 'Lightning Bolt', 'Fulmine'),
  entry('helix', 'Lightning Helix', 'Elica Fulminante'),
  entry('greaves', 'Lightning Greaves', 'Schinieri del Fulmine'),
  entry('counterspell', 'Counterspell', 'Contromagia'),
  entry('sol-ring', 'Sol Ring', 'Anello Solare'),
]);

const search = (query: string, limit = 8, lang: 'en' | 'it' = 'en') =>
  searchCards(catalog, { query, lang, today: '2026-11-13', limit });

describe('searchCards', () => {
  it('finds a card by its Italian name, with its default print in the asked language', async () => {
    const [found] = await search('contromagia', 8, 'it');

    expect(found).toMatchObject({
      card: { name: 'Counterspell' },
      defaultPrint: { id: 'counterspell-it' },
    });
  });

  it('finds cards whose name starts with what the user has typed so far, closest first', async () => {
    const names = (await search('lightn')).map((found) => found.card.name);

    expect(names).toEqual(['Lightning Bolt', 'Lightning Helix', 'Lightning Greaves']);
  });

  it('finds a card by the alternate name of one of its prints', async () => {
    const cyclonicRift = aCard({ oracleId: 'cyclonic-rift', name: 'Cyclonic Rift' });
    const riftCatalog = createInMemoryCatalog([
      { card: cyclonicRift, prints: [aPrint(), aPrint({ flavorName: "Hope's Aero Magic" })] },
    ]);

    const found = await searchCards(riftCatalog, {
      query: "Hope's Aero Magic",
      lang: 'en',
      today: '2026-11-13',
      limit: 8,
    });

    expect(found.map(({ card }) => card.name)).toEqual(['Cyclonic Rift']);
  });

  it('forgives a misspelled name', async () => {
    const names = (await search('Contrspell')).map((found) => found.card.name);

    expect(names).toEqual(['Counterspell']);
  });

  it('puts the card named exactly first, before those whose name only starts so', async () => {
    const catalogWithPrefix = createInMemoryCatalog([
      entry('forest-dryad', 'Forest Dryad'),
      entry('forest', 'Forest'),
    ]);

    const names = (
      await searchCards(catalogWithPrefix, {
        query: 'forest',
        lang: 'en',
        today: '2026-11-13',
        limit: 8,
      })
    ).map((found) => found.card.name);

    expect(names).toEqual(['Forest', 'Forest Dryad']);
  });

  it('puts a card that can be printed before an art series card of the same name', async () => {
    const artSeries = {
      card: aCard({ oracleId: 'forest-art', name: 'Forest' }),
      prints: [aPrint({ id: 'forest-art', layout: 'art_series' })],
    };
    const catalogWithArtSeries = createInMemoryCatalog([artSeries, entry('forest', 'Forest')]);

    const found = await searchCards(catalogWithArtSeries, {
      query: 'forest',
      lang: 'en',
      today: '2026-11-13',
      limit: 8,
    });

    expect(found.map((candidate) => candidate.card.oracleId)).toEqual(['forest', 'forest-art']);
  });

  it('keeps a token named exactly so before the paper cards whose name only starts so', async () => {
    const goblinToken = {
      card: aCard({ oracleId: 'goblin-token', name: 'Goblin' }),
      prints: [aPrint({ id: 'goblin-token', layout: 'token', setType: 'token' })],
    };
    const catalogWithToken = createInMemoryCatalog([
      entry('goblin-guide', 'Goblin Guide'),
      goblinToken,
    ]);

    const found = await searchCards(catalogWithToken, {
      query: 'goblin',
      lang: 'en',
      today: '2026-11-13',
      limit: 8,
    });

    expect(found.map((candidate) => candidate.card.oracleId)).toEqual([
      'goblin-token',
      'goblin-guide',
    ]);
  });

  it('tells, on each card found, how many cards share the name of its front face', async () => {
    const soldier = (oracleId: string, name = 'Soldier') => ({
      card: aCard({ oracleId, name }),
      prints: [aPrint({ id: oracleId, printedName: name, layout: 'token', setType: 'token' })],
    });
    const catalogWithSoldiers = createInMemoryCatalog([
      soldier('soldier-a'),
      soldier('soldier-b'),
      soldier('soldier-goblin', 'Soldier // Goblin'),
      entry('sol-ring', 'Sol Ring', 'Anello Solare'),
    ]);

    const found = await searchCards(catalogWithSoldiers, {
      query: 'sol',
      lang: 'en',
      today: '2026-11-13',
      limit: 8,
    });

    expect(
      Object.fromEntries(found.map((one) => [one.card.oracleId, one.sameNamedCardCount])),
    ).toEqual({ 'soldier-a': 3, 'soldier-b': 3, 'soldier-goblin': 3, 'sol-ring': 1 });
  });

  it('returns no more cards than the limit', async () => {
    expect(await search('lightning', 2)).toHaveLength(2);
  });

  it('returns nothing when no name comes close', async () => {
    expect(await search('xyzzy plover')).toEqual([]);
  });
});
