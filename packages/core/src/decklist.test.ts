import { describe, expect, it } from 'vitest';
import {
  applyCandidateChoice,
  chooseCandidate,
  createInMemoryCatalog,
  resolveDecklist,
  setLineQuantity,
} from './index.ts';
import { aCard, aPrint } from './test-fixtures.ts';

/** Fixed "today" for the default print rule: prints released later are not out yet. */
const today = '2026-11-07';
const solRing = aCard({ oracleId: 'sol-ring', name: 'Sol Ring' });
const solRingC21 = aPrint({ id: 'sol-ring-c21', releasedAt: '2021-04-23' });

describe('resolveDecklist', () => {
  it('resolves a "quantity name" line to its card and default print', async () => {
    const catalog = createInMemoryCatalog([{ card: solRing, prints: [solRingC21] }]);

    const lines = await resolveDecklist('4 Sol Ring', catalog, { today, lang: 'en' });

    expect(lines).toEqual([
      {
        text: '4 Sol Ring',
        status: 'resolved',
        quantity: 4,
        lang: 'en',
        card: solRing,
        defaultPrint: solRingC21,
        printWarning: null,
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
      { today, lang: 'en' },
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

    const lines = await resolveDecklist(exported, catalog, { today, lang: 'en' });

    expect(lines).toMatchObject([
      { text: '1 Sol Ring', status: 'resolved', quantity: 1, card: solRing },
      { text: 'SB: 2 Counterspell', status: 'resolved', quantity: 2, card: counterspell },
    ]);
  });

  it('reads "4x name" as four copies', async () => {
    const catalog = createInMemoryCatalog([{ card: solRing, prints: [solRingC21] }]);

    const [line] = await resolveDecklist('4x Sol Ring', catalog, { today, lang: 'en' });

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
      lang: 'en',
    });

    expect(lines).toMatchObject([
      { status: 'resolved', quantity: 1, card: solRing, defaultPrint: { id: 'sol-ring-c21' } },
      { status: 'resolved', quantity: 2, card: solRing, defaultPrint: { id: 'sol-ring-c21' } },
    ]);
  });

  it('matches set and collector number whatever their case', async () => {
    const variant = aPrint({ id: 'sol-ring-variant', set: 'plst', collectorNumber: 'c21-263' });
    const catalog = createInMemoryCatalog([{ card: solRing, prints: [solRingC21, variant] }]);

    const [line] = await resolveDecklist('1 Sol Ring (PLST) C21-263', catalog, {
      today,
      lang: 'en',
    });

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

    const [line] = await resolveDecklist('1 Sol Ring (C21) 263', catalog, { today, lang: 'en' });

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
      lang: 'en',
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

    const [line] = await resolveDecklist('1 sol rnig', catalog, { today, lang: 'en' });

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

    const [line] = await resolveDecklist('2 lightning', catalog, { today, lang: 'en' });

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
      { today, lang: 'en' },
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

    const [line] = await resolveDecklist('1 Seance', catalog, { today, lang: 'en' });

    expect(line).toMatchObject({ status: 'resolved', card: seance });
  });

  it('reads a line with only a name as one copy', async () => {
    const catalog = createInMemoryCatalog([{ card: solRing, prints: [solRingC21] }]);

    const [line] = await resolveDecklist('Sol Ring', catalog, { today, lang: 'en' });

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

    const [line] = await resolveDecklist('1 Sol Ring', catalog, { today, lang: 'en' });

    expect(line).toMatchObject({ status: 'resolved', defaultPrint: { id: 'latest-paper' } });
  });

  it('ignores prints that are not released yet when picking the default', async () => {
    const preview = aPrint({ id: 'preview', releasedAt: '2027-04-09' });
    const releasedToday = aPrint({ id: 'released-today', releasedAt: today });
    const catalog = createInMemoryCatalog([{ card: solRing, prints: [preview, releasedToday] }]);

    const [line] = await resolveDecklist('1 Sol Ring', catalog, { today, lang: 'en' });

    expect(line).toMatchObject({ defaultPrint: { id: 'released-today' } });
  });

  it('never picks a print in another language as the default of an English line', async () => {
    const english = aPrint({ id: 'english', releasedAt: '2021-04-23' });
    const italian = aPrint({ id: 'italian', lang: 'it', releasedAt: '2025-01-01' });
    const catalog = createInMemoryCatalog([{ card: solRing, prints: [english, italian] }]);

    const [line] = await resolveDecklist('1 Sol Ring', catalog, { today, lang: 'en' });

    expect(line).toMatchObject({ lang: 'en', defaultPrint: { id: 'english' } });
  });

  it('resolves a card without printable prints with no default print', async () => {
    const catalog = createInMemoryCatalog([
      { card: solRing, prints: [aPrint({ id: 'digital', digital: true })] },
    ]);

    const [line] = await resolveDecklist('1 Sol Ring', catalog, { today, lang: 'en' });

    expect(line).toMatchObject({ status: 'resolved', defaultPrint: null });
  });

  it('resolves a double-faced card by its full name, its front face, or its back face', async () => {
    const delver = aCard({ oracleId: 'delver', name: 'Delver of Secrets // Insectile Aberration' });
    const catalog = createInMemoryCatalog([{ card: delver, prints: [aPrint()] }]);

    const lines = await resolveDecklist(
      '1 Delver of Secrets\n1 delver of secrets // insectile aberration\n1 Insectile Aberration',
      catalog,
      { today, lang: 'en' },
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

    const lines = await resolveDecklist('1 Sol Ring\n1 Delver of Secrets', catalog, {
      today,
      lang: 'en',
    });

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

    const [line] = await resolveDecklist('3 Goblin', catalog, { today, lang: 'en' });

    expect(line).toEqual({
      text: '3 Goblin',
      status: 'ambiguous',
      quantity: 3,
      lang: 'en',
      candidates: [
        { card: goblinA, defaultPrint: goblinAPrint, printWarning: null },
        { card: goblinB, defaultPrint: goblinBPrint, printWarning: null },
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
    const [line] = await resolveDecklist('3 Goblin', catalog, { today, lang: 'en' });
    if (line?.status !== 'ambiguous') throw new Error('expected an ambiguous line');

    expect(chooseCandidate(line, 'goblin-b')).toEqual({
      text: '3 Goblin',
      status: 'resolved',
      quantity: 3,
      lang: 'en',
      card: goblinB,
      defaultPrint: goblinBPrint,
      printWarning: null,
      allocations: [],
    });
  });
});

describe('resolveDecklist in Italian', () => {
  const inItalian = { today, lang: 'it' } as const;

  it('defaults to the most recent printable Italian print', async () => {
    const english = aPrint({ id: 'english', releasedAt: '2025-01-01' });
    const italianOld = aPrint({ id: 'italian-old', lang: 'it', releasedAt: '2010-01-01' });
    const italianNew = aPrint({ id: 'italian-new', lang: 'it', releasedAt: '2021-04-23' });
    const italianDigital = aPrint({
      id: 'italian-digital',
      lang: 'it',
      releasedAt: '2024-01-01',
      digital: true,
    });
    const catalog = createInMemoryCatalog([
      { card: solRing, prints: [english, italianOld, italianNew, italianDigital] },
    ]);

    const [line] = await resolveDecklist('1 Sol Ring', catalog, inItalian);

    expect(line).toMatchObject({
      lang: 'it',
      defaultPrint: { id: 'italian-new' },
      printWarning: null,
    });
  });

  it('keeps a low-resolution Italian print as default, warning that English looks better', async () => {
    const english = aPrint({ id: 'english', releasedAt: '2025-01-01' });
    const lowres = aPrint({
      id: 'italian-lowres',
      lang: 'it',
      releasedAt: '2021-04-23',
      imageStatus: 'lowres',
    });
    const catalog = createInMemoryCatalog([{ card: solRing, prints: [english, lowres] }]);

    const [line] = await resolveDecklist('1 Sol Ring', catalog, inItalian);

    expect(line).toMatchObject({
      lang: 'it',
      defaultPrint: { id: 'italian-lowres' },
      printWarning: 'lowResolution',
    });
  });

  it('says when a low-resolution Italian print has no English print to switch to', async () => {
    const lowres = aPrint({ id: 'italian-lowres', lang: 'it', imageStatus: 'lowres' });
    const englishPlaceholder = aPrint({ id: 'english-placeholder', imageStatus: 'placeholder' });
    const catalog = createInMemoryCatalog([
      { card: solRing, prints: [lowres, englishPlaceholder] },
    ]);

    const [line] = await resolveDecklist('1 Sol Ring', catalog, inItalian);

    expect(line).toMatchObject({
      defaultPrint: { id: 'italian-lowres' },
      printWarning: 'lowResolutionWithoutEnglish',
    });
  });

  it('says when a low-resolution Italian print a line names has no English version', async () => {
    const named = { set: 'c21', collectorNumber: '263' };
    const italian = aPrint({ id: 'c21-it', lang: 'it', ...named, imageStatus: 'lowres' });
    const otherEnglish = aPrint({ id: 'cmm-en', set: 'cmm', collectorNumber: '410' });
    const catalog = createInMemoryCatalog([{ card: solRing, prints: [italian, otherEnglish] }]);

    const [line] = await resolveDecklist('1 Sol Ring (C21) 263', catalog, inItalian);

    expect(line).toMatchObject({
      defaultPrint: { id: 'c21-it' },
      printWarning: 'lowResolutionWithoutEnglish',
    });
  });

  it('falls back to the English default, warning, when no Italian print has a real image', async () => {
    const english = aPrint({ id: 'english', releasedAt: '2021-04-23' });
    const placeholder = aPrint({
      id: 'italian-placeholder',
      lang: 'it',
      releasedAt: '2025-01-01',
      imageStatus: 'placeholder',
    });
    const missing = aPrint({
      id: 'italian-missing',
      lang: 'it',
      releasedAt: '2024-01-01',
      imageStatus: 'missing',
    });
    const counterspell = aCard({ oracleId: 'counterspell', name: 'Counterspell' });
    const catalog = createInMemoryCatalog([
      { card: solRing, prints: [english, placeholder, missing] },
      { card: counterspell, prints: [aPrint({ id: 'counterspell-en' })] },
    ]);

    const lines = await resolveDecklist('1 Sol Ring\n1 Counterspell', catalog, inItalian);

    expect(lines).toMatchObject([
      { lang: 'it', defaultPrint: { id: 'english' }, printWarning: 'languageFallback' },
      { lang: 'it', defaultPrint: { id: 'counterspell-en' }, printWarning: 'languageFallback' },
    ]);
  });

  it('falls back to a low-resolution English print with the language warning', async () => {
    const lowres = aPrint({ id: 'english-lowres', imageStatus: 'lowres' });
    const catalog = createInMemoryCatalog([{ card: solRing, prints: [lowres] }]);

    const [line] = await resolveDecklist('1 Sol Ring', catalog, inItalian);

    expect(line).toMatchObject({
      defaultPrint: { id: 'english-lowres' },
      printWarning: 'languageFallback',
    });
  });

  it('uses the Italian print a line names by set and number, warning when it is low-resolution', async () => {
    const named = { set: 'c21', collectorNumber: '263' };
    const english = aPrint({ id: 'c21-en', ...named });
    const italian = aPrint({ id: 'c21-it', lang: 'it', ...named, imageStatus: 'lowres' });
    const catalog = createInMemoryCatalog([{ card: solRing, prints: [english, italian] }]);

    const [line] = await resolveDecklist('1 Sol Ring (C21) 263', catalog, inItalian);

    expect(line).toMatchObject({
      lang: 'it',
      defaultPrint: { id: 'c21-it' },
      printWarning: 'lowResolution',
    });
  });

  it('falls back, warning, to the English print a line names when its Italian one has no real image', async () => {
    const named = { set: 'c21', collectorNumber: '263' };
    const english = aPrint({ id: 'c21-en', ...named });
    const italian = aPrint({ id: 'c21-it', lang: 'it', ...named, imageStatus: 'placeholder' });
    const catalog = createInMemoryCatalog([{ card: solRing, prints: [italian, english] }]);

    const [line] = await resolveDecklist('1 Sol Ring (C21) 263', catalog, inItalian);

    expect(line).toMatchObject({
      lang: 'it',
      defaultPrint: { id: 'c21-en' },
      printWarning: 'languageFallback',
    });
  });
});

describe('setLineQuantity', () => {
  it('changes how many copies a line prints, keeping the rest of it', async () => {
    const catalog = createInMemoryCatalog([{ card: solRing, prints: [solRingC21] }]);
    const [line] = await resolveDecklist('4 Sol Ring', catalog, { today, lang: 'en' });
    if (!line) throw new Error('expected a line');

    expect(setLineQuantity(line, 2)).toEqual({ ...line, quantity: 2 });
  });

  it('refuses a quantity that is not a whole number of at least one copy', async () => {
    const catalog = createInMemoryCatalog([{ card: solRing, prints: [solRingC21] }]);
    const [line] = await resolveDecklist('4 Sol Ring', catalog, { today, lang: 'en' });
    if (!line) throw new Error('expected a line');

    expect(() => setLineQuantity(line, 0)).toThrow();
    expect(() => setLineQuantity(line, 1.5)).toThrow();
  });
});

describe('applyCandidateChoice', () => {
  const goblinA = aCard({ oracleId: 'goblin-a', name: 'Goblin' });
  const goblinB = aCard({ oracleId: 'goblin-b', name: 'Goblin' });
  const catalog = createInMemoryCatalog([
    { card: goblinA, prints: [aPrint({ id: 'goblin-a-print' })] },
    { card: goblinB, prints: [aPrint({ id: 'goblin-b-print' })] },
  ]);

  it('resolves an ambiguous line to the card the user picked among its candidates', async () => {
    const [line] = await resolveDecklist('3 Goblin', catalog, { today, lang: 'it' });
    if (!line) throw new Error('expected a line');

    expect(applyCandidateChoice(line, 'goblin-b')).toMatchObject({
      status: 'resolved',
      lang: 'it',
      card: goblinB,
      defaultPrint: { id: 'goblin-b-print' },
    });
  });

  it('leaves the line as it is when the picked card is not among its candidates', async () => {
    const [line] = await resolveDecklist('3 Goblin', catalog, { today, lang: 'en' });
    if (!line) throw new Error('expected a line');

    expect(applyCandidateChoice(line, 'sol-ring')).toBe(line);
  });

  it('leaves a line that is not ambiguous as it is', async () => {
    const [line] = await resolveDecklist(
      '1 Sol Ring',
      createInMemoryCatalog([{ card: solRing, prints: [solRingC21] }]),
      { today, lang: 'en' },
    );
    if (!line) throw new Error('expected a line');

    expect(applyCandidateChoice(line, 'goblin-a')).toBe(line);
  });
});
