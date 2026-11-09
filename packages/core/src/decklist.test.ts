import { describe, expect, it } from 'vitest';
import { chooseCandidate, createInMemoryCatalog, resolveDecklist } from './index.ts';
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
      '4 sol ring\n\n  2   COUNTERSPELL  \r\n1 Xyzzy Plover\n',
      catalog,
      { today },
    );

    expect(lines.map((line) => [line.text, line.status, line.quantity])).toEqual([
      ['4 sol ring', 'resolved', 4],
      ['  2   COUNTERSPELL  ', 'resolved', 2],
      ['1 Xyzzy Plover', 'notFound', 1],
    ]);
  });

  it('ignores section headers and comments of deckbuilder exports', async () => {
    const counterspell = aCard({ oracleId: 'counterspell', name: 'Counterspell' });
    const catalog = createInMemoryCatalog([
      { card: solRing, prints: [solRingC21] },
      { card: counterspell, prints: [aPrint({ id: 'counterspell-mh2' })] },
    ]);
    const exported = [
      'Commander',
      '1 Sol Ring',
      '',
      'Deck',
      '// Instants',
      '# from Moxfield',
      'Creatures (12)',
      'Sideboard:',
      'SB: 2 Counterspell',
      'MAYBEBOARD',
    ].join('\n');

    const lines = await resolveDecklist(exported, catalog, { today });

    expect(lines).toMatchObject([
      { text: '1 Sol Ring', status: 'resolved', quantity: 1, card: solRing },
      { text: 'SB: 2 Counterspell', status: 'resolved', quantity: 2, card: counterspell },
    ]);
  });

  it('reads "4x name" as four copies', async () => {
    const catalog = createInMemoryCatalog([{ card: solRing, prints: [solRingC21] }]);

    const [line] = await resolveDecklist('4x Sol Ring', catalog, { today });

    expect(line).toMatchObject({ status: 'resolved', quantity: 4, card: solRing });
  });

  it('uses exactly the print an Arena or MTGO line names by set and collector number', async () => {
    const c21 = aPrint({
      id: 'sol-ring-c21',
      set: 'c21',
      collectorNumber: '263',
      releasedAt: '2021-04-23',
    });
    const cmm = aPrint({
      id: 'sol-ring-cmm',
      set: 'cmm',
      collectorNumber: '410',
      releasedAt: '2023-08-04',
    });
    const catalog = createInMemoryCatalog([{ card: solRing, prints: [c21, cmm] }]);

    const lines = await resolveDecklist('1 Sol Ring (C21) 263\n2 Sol Ring (C21) 263 *F*', catalog, {
      today,
    });

    expect(lines).toMatchObject([
      { status: 'resolved', quantity: 1, card: solRing, defaultPrint: { id: 'sol-ring-c21' } },
      { status: 'resolved', quantity: 2, card: solRing, defaultPrint: { id: 'sol-ring-c21' } },
    ]);
  });

  it('matches set and collector number whatever their case', async () => {
    const variant = aPrint({ id: 'sol-ring-variant', set: 'plst', collectorNumber: 'c21-263' });
    const catalog = createInMemoryCatalog([{ card: solRing, prints: [solRingC21, variant] }]);

    const [line] = await resolveDecklist('1 Sol Ring (PLST) C21-263', catalog, { today });

    expect(line).toMatchObject({ defaultPrint: { id: 'sol-ring-variant' } });
  });

  it('takes the language of the named print when it exists only in another one', async () => {
    const italianOnly = aPrint({
      id: 'sol-ring-it',
      lang: 'it',
      set: 'c21',
      collectorNumber: '263',
    });
    const catalog = createInMemoryCatalog([{ card: solRing, prints: [solRingC21, italianOnly] }]);

    const [line] = await resolveDecklist('1 Sol Ring (C21) 263', catalog, { today });

    expect(line).toMatchObject({ lang: 'it', defaultPrint: { id: 'sol-ring-it' } });
  });

  it('falls back to the name when the set and number name no print of that card', async () => {
    const counterspell = aCard({ oracleId: 'counterspell', name: 'Counterspell' });
    const counterspellMh2 = aPrint({ id: 'counterspell-mh2', set: 'mh2', collectorNumber: '267' });
    const catalog = createInMemoryCatalog([
      { card: solRing, prints: [solRingC21] },
      { card: counterspell, prints: [counterspellMh2] },
    ]);

    const lines = await resolveDecklist('1 Sol Ring (XXX) 999\n1 Sol Ring (MH2) 267', catalog, {
      today,
    });

    expect(lines).toMatchObject([
      { text: '1 Sol Ring (XXX) 999', status: 'resolved', card: solRing, defaultPrint: solRingC21 },
      { text: '1 Sol Ring (MH2) 267', status: 'resolved', card: solRing, defaultPrint: solRingC21 },
    ]);
  });

  it('resolves a misspelled name to the closest card', async () => {
    const solTalisman = aCard({ oracleId: 'sol-talisman', name: 'Sol Talisman' });
    const catalog = createInMemoryCatalog([
      { card: solRing, prints: [solRingC21] },
      { card: solTalisman, prints: [aPrint({ id: 'sol-talisman-mir' })] },
    ]);

    const [line] = await resolveDecklist('1 sol rnig', catalog, { today });

    expect(line).toMatchObject({ status: 'resolved', card: solRing });
  });

  it('suggests the closest cards, best first, when a misspelled name is about as close to each', async () => {
    const bolt = aCard({ oracleId: 'bolt', name: 'Lightning Bolt' });
    const helix = aCard({ oracleId: 'helix', name: 'Lightning Helix' });
    const greaves = aCard({ oracleId: 'greaves', name: 'Lightning Greaves' });
    const catalog = createInMemoryCatalog([
      { card: greaves, prints: [aPrint()] },
      { card: helix, prints: [aPrint()] },
      { card: bolt, prints: [aPrint()] },
    ]);

    const [line] = await resolveDecklist('2 lightning', catalog, { today });

    // "lightning" is about as close to Bolt and Helix, clearly further from Greaves.
    expect(line).toMatchObject({
      status: 'ambiguous',
      quantity: 2,
      candidates: [{ card: bolt }, { card: helix }],
    });
  });

  it('resolves an Italian printed name, even one an older reprint used, to its card', async () => {
    const solRingIt = aPrint({ id: 'sol-ring-it', lang: 'it', printedName: 'Anello Solare' });
    const emberBeast = aCard({ oracleId: 'ember-beast', name: 'Ember Beast' });
    const catalog = createInMemoryCatalog([
      { card: solRing, prints: [solRingC21, solRingIt] },
      {
        card: emberBeast,
        prints: [
          aPrint({ id: 'ember-beast-it-old', lang: 'it', printedName: 'Bestia Tizzone' }),
          aPrint({ id: 'ember-beast-it', lang: 'it', printedName: 'Bestia di Brace' }),
        ],
      },
    ]);

    const lines = await resolveDecklist(
      '1 anello solare\n1 Bestia Tizzone\n1 bestia di brace',
      catalog,
      { today },
    );

    expect(lines).toMatchObject([
      { status: 'resolved', card: solRing },
      { status: 'resolved', card: emberBeast },
      { status: 'resolved', card: emberBeast },
    ]);
  });

  it('ignores accents in the written name', async () => {
    const seance = aCard({ oracleId: 'seance', name: 'Séance' });
    const catalog = createInMemoryCatalog([{ card: seance, prints: [aPrint()] }]);

    const [line] = await resolveDecklist('1 Seance', catalog, { today });

    expect(line).toMatchObject({ status: 'resolved', card: seance });
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

  it('resolves a double-faced card by its full name, its front face, or its back face', async () => {
    const delver = aCard({ oracleId: 'delver', name: 'Delver of Secrets // Insectile Aberration' });
    const catalog = createInMemoryCatalog([{ card: delver, prints: [aPrint()] }]);

    const lines = await resolveDecklist(
      '1 Delver of Secrets\n1 delver of secrets // insectile aberration\n1 Insectile Aberration',
      catalog,
      { today },
    );

    // The back face alone is no exact name: it matches the full name as a misspelling would.
    expect(lines).toMatchObject([
      { status: 'resolved', card: delver },
      { status: 'resolved', card: delver },
      { status: 'resolved', card: delver },
    ]);
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
    const goblinAPrint = aPrint({ id: 'goblin-a-print' });
    const goblinBPrint = aPrint({ id: 'goblin-b-print' });
    const catalog = createInMemoryCatalog([
      { card: goblinA, prints: [goblinAPrint] },
      { card: goblinB, prints: [goblinBPrint] },
    ]);

    const [line] = await resolveDecklist('3 Goblin', catalog, { today });

    expect(line).toEqual({
      text: '3 Goblin',
      status: 'ambiguous',
      quantity: 3,
      lang: 'en',
      candidates: [
        { card: goblinA, defaultPrint: goblinAPrint },
        { card: goblinB, defaultPrint: goblinBPrint },
      ],
    });
  });
});

describe('chooseCandidate', () => {
  it('resolves an ambiguous line to the chosen candidate, keeping its text and quantity', async () => {
    const goblinA = aCard({ oracleId: 'goblin-a', name: 'Goblin' });
    const goblinB = aCard({ oracleId: 'goblin-b', name: 'Goblin' });
    const goblinBPrint = aPrint({ id: 'goblin-b-print' });
    const catalog = createInMemoryCatalog([
      { card: goblinA, prints: [aPrint({ id: 'goblin-a-print' })] },
      { card: goblinB, prints: [goblinBPrint] },
    ]);
    const [line] = await resolveDecklist('3 Goblin', catalog, { today });
    if (line?.status !== 'ambiguous') throw new Error('expected an ambiguous line');

    expect(chooseCandidate(line, 'goblin-b')).toEqual({
      text: '3 Goblin',
      status: 'resolved',
      quantity: 3,
      lang: 'en',
      card: goblinB,
      defaultPrint: goblinBPrint,
      allocations: [],
    });
  });
});
