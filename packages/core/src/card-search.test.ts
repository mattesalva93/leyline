import { describe, expect, it } from 'vitest';
import { createInMemoryCatalog, searchCards } from './index.ts';
import { aCard, aPrint } from './test-fixtures.ts';
import type { CatalogEntry } from './types.ts';

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

  it('returns no more cards than the limit', async () => {
    expect(await search('lightning', 2)).toHaveLength(2);
  });

  it('returns nothing when no name comes close', async () => {
    expect(await search('xyzzy plover')).toEqual([]);
  });
});
