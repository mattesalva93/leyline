import { describe, expect, it } from 'vitest';
import { createInMemoryCatalog, listCardsNamed } from '../index.ts';
import { aCard, aPrint } from '../test-support/test-fixtures.ts';
import type { CatalogEntry, Lang } from '../types.ts';

const TODAY = '2026-11-18';
const tokenLayout = { layout: 'token', setType: 'token' };

function token(oracleId: string, name: string, releasedAt = '2020-01-01'): CatalogEntry {
  return {
    card: aCard({ oracleId, name }),
    prints: [aPrint({ id: `${oracleId}-en`, printedName: name, releasedAt, ...tokenLayout })],
  };
}

const list = (entries: readonly CatalogEntry[], name: string, lang: Lang = 'en') =>
  listCardsNamed(createInMemoryCatalog(entries), { name, lang, today: TODAY });

const oracleIdsOf = (found: readonly { card: { oracleId: string } }[]) =>
  found.map((candidate) => candidate.card.oracleId);

describe('listCardsNamed', () => {
  it('lists every card named so, and the double-faced cards whose front face is named so', async () => {
    const found = await list(
      [
        token('soldier-a', 'Soldier'),
        token('soldier-goblin', 'Soldier // Goblin'),
        token('goblin', 'Goblin'),
        token('soldier-b', 'Soldier'),
        token('soldier-ally', 'Soldier Ally'),
      ],
      'soldier',
    );

    expect(oracleIdsOf(found).sort()).toEqual(['soldier-a', 'soldier-b', 'soldier-goblin']);
  });

  it('orders the cards by name, then newest default print first, then oracle id', async () => {
    const entries = [
      token('soldier-soldier', 'Soldier // Soldier'),
      token('soldier-old-b', 'Soldier', '2019-01-01'),
      token('soldier-goblin', 'Soldier // Goblin'),
      token('soldier-new', 'Soldier', '2025-01-01'),
      token('soldier-old-a', 'Soldier', '2019-01-01'),
    ];

    const orders = await Promise.all(
      [entries, [...entries].reverse()].map(async (shuffled) =>
        oracleIdsOf(await list(shuffled, 'Soldier')),
      ),
    );

    expect(orders).toEqual([
      ['soldier-new', 'soldier-old-a', 'soldier-old-b', 'soldier-goblin', 'soldier-soldier'],
      ['soldier-new', 'soldier-old-a', 'soldier-old-b', 'soldier-goblin', 'soldier-soldier'],
    ]);
  });

  it('gives a card with no print in the asked language its English print', async () => {
    const italianSoldier: CatalogEntry = {
      card: aCard({ oracleId: 'soldier-a', name: 'Soldier' }),
      prints: [
        aPrint({ id: 'soldier-a-en', printedName: 'Soldier', ...tokenLayout }),
        aPrint({ id: 'soldier-a-it', lang: 'it', printedName: 'Soldato', ...tokenLayout }),
      ],
    };

    const found = await list([italianSoldier, token('soldier-b', 'Soldier')], 'Soldier', 'it');

    expect(found).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ defaultPrint: expect.objectContaining({ id: 'soldier-a-it' }) }),
        expect.objectContaining({
          defaultPrint: expect.objectContaining({ id: 'soldier-b-en' }),
          printWarning: 'languageFallback',
        }),
      ]),
    );
  });

  it('leaves out a card with no printable print', async () => {
    const unscanned: CatalogEntry = {
      card: aCard({ oracleId: 'soldier-unscanned', name: 'Soldier' }),
      prints: [
        aPrint({ id: 'soldier-unscanned-en', printedName: 'Soldier', imageStatus: 'missing' }),
      ],
    };

    const found = await list([token('soldier-a', 'Soldier'), unscanned], 'Soldier');

    expect(oracleIdsOf(found)).toEqual(['soldier-a']);
  });

  it('leaves out an art series card named after a card, as resolving a line does', async () => {
    const forest: CatalogEntry = {
      card: aCard({ oracleId: 'forest', name: 'Forest' }),
      prints: [aPrint({ id: 'forest-en', printedName: 'Forest' })],
    };
    const forestArt: CatalogEntry = {
      card: aCard({ oracleId: 'forest-art', name: 'Forest' }),
      prints: [aPrint({ id: 'forest-art-en', printedName: 'Forest', layout: 'art_series' })],
    };

    const found = await list([forestArt, forest], 'Forest');

    expect(oracleIdsOf(found)).toEqual(['forest']);
  });
});
