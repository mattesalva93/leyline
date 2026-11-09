import { describe, expect, it } from 'vitest';
import { createInMemoryCatalog, resolveDecklist } from './index.ts';
import { aCard, aPrint } from './test-fixtures.ts';

/** Fixed "today" for the default print rule: prints released later are not out yet. */
const today = '2026-11-07';
const solRing = aCard({ oracleId: 'sol-ring', name: 'Sol Ring' });
const solRingC21 = aPrint({ id: 'sol-ring-c21', releasedAt: '2021-04-23' });

describe('resolveDecklist', () => {
  it('resolves a "quantity name" line to its card and default print', async () => {
    const catalog = createInMemoryCatalog([{ card: solRing, prints: [solRingC21] }]);

    const lines = await resolveDecklist('4 Sol Ring', catalog, { today });

    expect(lines).toEqual([
      {
        text: '4 Sol Ring',
        status: 'resolved',
        quantity: 4,
        lang: 'en',
        card: solRing,
        defaultPrint: solRingC21,
        allocations: [],
      },
    ]);
  });

  it('skips blank lines, ignores case and surrounding spaces, and flags unknown names', async () => {
    const counterspell = aCard({ oracleId: 'counterspell', name: 'Counterspell' });
    const catalog = createInMemoryCatalog([
      { card: solRing, prints: [solRingC21] },
      { card: counterspell, prints: [aPrint({ id: 'counterspell-mh2' })] },
    ]);

    const lines = await resolveDecklist(
      '4 sol ring\n\n  2   COUNTERSPELL  \r\n1 Sol Rnig\n',
      catalog,
      { today },
    );

    expect(lines.map((line) => [line.text, line.status, line.quantity])).toEqual([
      ['4 sol ring', 'resolved', 4],
      ['  2   COUNTERSPELL  ', 'resolved', 2],
      ['1 Sol Rnig', 'notFound', 1],
    ]);
  });

  it('reads a line with only a name as one copy', async () => {
    const catalog = createInMemoryCatalog([{ card: solRing, prints: [solRingC21] }]);

    const [line] = await resolveDecklist('Sol Ring', catalog, { today });

    expect(line).toMatchObject({ status: 'resolved', quantity: 1, card: solRing });
  });

  it('picks the most recent printable paper print as default', async () => {
    const newer = '2026-01-01';
    const unprintable = [
      aPrint({ id: 'digital', releasedAt: newer, digital: true }),
      aPrint({ id: 'art-series', releasedAt: newer, layout: 'art_series' }),
      aPrint({ id: 'oversized', releasedAt: newer, oversized: true }),
      aPrint({ id: 'token-layout', releasedAt: newer, layout: 'token' }),
      aPrint({ id: 'token-set', releasedAt: newer, setType: 'token' }),
      aPrint({ id: 'playtest', releasedAt: newer, setType: 'funny', promoTypes: ['playtest'] }),
      aPrint({ id: 'placeholder', releasedAt: newer, imageStatus: 'placeholder' }),
      aPrint({ id: 'missing', releasedAt: newer, imageStatus: 'missing' }),
    ];
    const older = aPrint({ id: 'older', releasedAt: '2010-01-01' });
    const latestPaper = aPrint({ id: 'latest-paper', releasedAt: '2024-06-01' });
    const catalog = createInMemoryCatalog([
      { card: solRing, prints: [older, ...unprintable, latestPaper] },
    ]);

    const [line] = await resolveDecklist('1 Sol Ring', catalog, { today });

    expect(line).toMatchObject({ status: 'resolved', defaultPrint: { id: 'latest-paper' } });
  });

  it('ignores prints that are not released yet when picking the default', async () => {
    const preview = aPrint({ id: 'preview', releasedAt: '2027-04-09' });
    const releasedToday = aPrint({ id: 'released-today', releasedAt: today });
    const catalog = createInMemoryCatalog([{ card: solRing, prints: [preview, releasedToday] }]);

    const [line] = await resolveDecklist('1 Sol Ring', catalog, { today });

    expect(line).toMatchObject({ defaultPrint: { id: 'released-today' } });
  });

  it('never picks a print in another language as the default of an English line', async () => {
    const english = aPrint({ id: 'english', releasedAt: '2021-04-23' });
    const italian = aPrint({ id: 'italian', lang: 'it', releasedAt: '2025-01-01' });
    const catalog = createInMemoryCatalog([{ card: solRing, prints: [english, italian] }]);

    const [line] = await resolveDecklist('1 Sol Ring', catalog, { today });

    expect(line).toMatchObject({ lang: 'en', defaultPrint: { id: 'english' } });
  });

  it('resolves a card without printable prints with no default print', async () => {
    const catalog = createInMemoryCatalog([
      { card: solRing, prints: [aPrint({ id: 'digital', digital: true })] },
    ]);

    const [line] = await resolveDecklist('1 Sol Ring', catalog, { today });

    expect(line).toMatchObject({ status: 'resolved', defaultPrint: null });
  });

  it('resolves a double-faced card by its full name or its front-face name', async () => {
    const delver = aCard({ oracleId: 'delver', name: 'Delver of Secrets // Insectile Aberration' });
    const catalog = createInMemoryCatalog([{ card: delver, prints: [aPrint()] }]);

    const lines = await resolveDecklist(
      '1 Delver of Secrets\n1 delver of secrets // insectile aberration\n1 Insectile Aberration',
      catalog,
      { today },
    );

    expect(lines.map((line) => line.status)).toEqual(['resolved', 'resolved', 'notFound']);
  });

  it('prefers the printable card when an art series card shares its name', async () => {
    // Scryfall gives art series their own oracle id, named "Front // Back" after the card.
    const delver = aCard({ oracleId: 'delver', name: 'Delver of Secrets // Insectile Aberration' });
    const delverArt = aCard({
      oracleId: 'delver-art',
      name: 'Delver of Secrets // Delver of Secrets',
    });
    const solRingArt = aCard({ oracleId: 'sol-ring-art', name: 'Sol Ring // Sol Ring' });
    const artSeries = aPrint({ layout: 'art_series', setType: 'memorabilia' });
    const catalog = createInMemoryCatalog([
      { card: solRing, prints: [solRingC21] },
      { card: solRingArt, prints: [artSeries] },
      { card: delver, prints: [aPrint()] },
      { card: delverArt, prints: [artSeries] },
    ]);

    const lines = await resolveDecklist('1 Sol Ring\n1 Delver of Secrets', catalog, { today });

    expect(lines).toMatchObject([
      { status: 'resolved', card: solRing },
      { status: 'resolved', card: delver },
    ]);
  });

  it('marks a name shared by several cards as ambiguous, listing them', async () => {
    const goblinA = aCard({ oracleId: 'goblin-a', name: 'Goblin' });
    const goblinB = aCard({ oracleId: 'goblin-b', name: 'Goblin' });
    const catalog = createInMemoryCatalog([
      { card: goblinA, prints: [aPrint()] },
      { card: goblinB, prints: [aPrint()] },
    ]);

    const [line] = await resolveDecklist('3 Goblin', catalog, { today });

    expect(line).toEqual({
      text: '3 Goblin',
      status: 'ambiguous',
      quantity: 3,
      lang: 'en',
      candidates: [goblinA, goblinB],
    });
  });
});
