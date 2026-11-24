import { describe, expect, it } from 'vitest';
import {
  applyCandidateChoice,
  previewPrint,
  chooseCandidate,
  copyCount,
  createInMemoryCatalog,
  resolveDecklist,
  setLineQuantity,
} from '../index.ts';
import { aCard, aPrint } from '../test-support/test-fixtures.ts';

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

  it('reads a line with the sideboard prefix as a card, never as a section header', async () => {
    const catalog = createInMemoryCatalog([{ card: solRing, prints: [solRingC21] }]);

    const lines = await resolveDecklist('SB: Lands', catalog, { today, lang: 'en' });

    expect(lines).toMatchObject([{ text: 'SB: Lands', status: 'notFound', quantity: 1 }]);
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

  it('ignores the categories and color tag an Archidekt Text export ends a line with', async () => {
    const otherSolRing = aPrint({ id: 'sol-ring-cmr', set: 'cmr', collectorNumber: '472' });
    const catalog = createInMemoryCatalog([{ card: solRing, prints: [solRingC21, otherSolRing] }]);

    const lines = await resolveDecklist(
      [
        '1x Sol Ring (cmr) 472 *F* [Ramp] ^Buy,#0066ff^',
        '1x Sol Ring (cmr) 472 [Commander{top},Ramp{noDeck}{noPrice}]',
        '2x Sol Ring [Ramp]',
        '3x Sol Ring ^Have,#37d67a^',
      ].join('\n'),
      catalog,
      { today, lang: 'en' },
    );

    expect(
      lines.map((line) => [line.quantity, line.status === 'resolved' && line.defaultPrint?.id]),
    ).toEqual([
      [1, 'sol-ring-cmr'],
      [1, 'sol-ring-cmr'],
      [2, 'sol-ring-c21'],
      [3, 'sol-ring-c21'],
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

  it('prefers a paper print over playtest, oversized, art series, token and digital ones', async () => {
    // Most preferred first, each newer than the one before it: only the order can pick.
    const byPreference = [
      aPrint({ id: 'paper', releasedAt: '2010-01-01' }),
      aPrint({ id: 'playtest', releasedAt: '2011-01-01', promoTypes: ['playtest'] }),
      aPrint({ id: 'oversized', releasedAt: '2012-01-01', oversized: true }),
      aPrint({ id: 'art-series', releasedAt: '2013-01-01', layout: 'art_series' }),
      aPrint({ id: 'token', releasedAt: '2014-01-01', layout: 'token', setType: 'token' }),
      aPrint({ id: 'digital', releasedAt: '2015-01-01', digital: true }),
    ];

    const defaults = await Promise.all(
      byPreference.map(async (_, first) => {
        const catalog = createInMemoryCatalog([
          { card: solRing, prints: byPreference.slice(first) },
        ]);
        const [line] = await resolveDecklist('1 Sol Ring', catalog, { today, lang: 'en' });
        return line?.status === 'resolved' ? line.defaultPrint?.id : line?.status;
      }),
    );

    expect(defaults).toEqual(['paper', 'playtest', 'oversized', 'art-series', 'token', 'digital']);
  });

  it('prefers a regular paper print over one with an alternate name', async () => {
    const regular = aPrint({ id: 'regular', releasedAt: '2010-01-01' });
    const alternateName = aPrint({
      id: 'alternate-name',
      releasedAt: '2024-01-01',
      flavorName: 'Ring of Power',
    });
    const playtest = aPrint({ id: 'playtest', releasedAt: '2025-01-01', promoTypes: ['playtest'] });

    const [withRegular, withoutRegular] = await Promise.all(
      [
        [regular, alternateName, playtest],
        [alternateName, playtest],
      ].map(async (prints) => {
        const catalog = createInMemoryCatalog([{ card: solRing, prints }]);
        const [line] = await resolveDecklist('1 Sol Ring', catalog, { today, lang: 'en' });
        return line?.status === 'resolved' ? line.defaultPrint?.id : line?.status;
      }),
    );

    expect([withRegular, withoutRegular]).toEqual(['regular', 'alternate-name']);
  });

  it('defaults to the most recent print of the most preferred kind', async () => {
    const older = aPrint({ id: 'older', releasedAt: '2010-01-01' });
    const latestPaper = aPrint({ id: 'latest-paper', releasedAt: '2024-06-01' });
    const newerDigital = aPrint({ id: 'digital', releasedAt: '2026-01-01', digital: true });
    const catalog = createInMemoryCatalog([
      { card: solRing, prints: [older, newerDigital, latestPaper] },
    ]);

    const [line] = await resolveDecklist('1 Sol Ring', catalog, { today, lang: 'en' });

    expect(line).toMatchObject({ status: 'resolved', defaultPrint: { id: 'latest-paper' } });
  });

  it('ranks a print by the least preferred kind it belongs to', async () => {
    const digitalPlaytest = aPrint({
      id: 'digital-playtest',
      releasedAt: '2026-01-01',
      digital: true,
      promoTypes: ['playtest'],
    });
    const token = aPrint({ id: 'token', releasedAt: '2010-01-01', layout: 'token' });
    const catalog = createInMemoryCatalog([{ card: solRing, prints: [digitalPlaytest, token] }]);

    const [line] = await resolveDecklist('1 Sol Ring', catalog, { today, lang: 'en' });

    expect(line).toMatchObject({ defaultPrint: { id: 'token' } });
  });

  it('never defaults to a print Scryfall has no scan of', async () => {
    const paper = aPrint({ id: 'paper', releasedAt: '2010-01-01' });
    const placeholder = aPrint({
      id: 'placeholder',
      releasedAt: '2026-01-01',
      imageStatus: 'placeholder',
    });
    const missing = aPrint({ id: 'missing', releasedAt: '2026-01-01', imageStatus: 'missing' });
    const catalog = createInMemoryCatalog([
      { card: solRing, prints: [placeholder, missing, paper] },
    ]);

    const [line] = await resolveDecklist('1 Sol Ring', catalog, { today, lang: 'en' });

    expect(line).toMatchObject({ defaultPrint: { id: 'paper' } });
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
      { card: solRing, prints: [aPrint({ id: 'missing', imageStatus: 'missing' })] },
    ]);

    const [line] = await resolveDecklist('1 Sol Ring', catalog, { today, lang: 'en' });

    expect(line).toMatchObject({ status: 'resolved', defaultPrint: null });
  });

  it('leaves a line ambiguous between a token and a paper card that only look alike', async () => {
    const goblinToken = aCard({ oracleId: 'goblin-a', name: 'Goblin A' });
    const goblinCard = aCard({ oracleId: 'goblin-b', name: 'Goblin B' });
    const catalog = createInMemoryCatalog([
      {
        card: goblinToken,
        prints: [aPrint({ id: 'token', layout: 'token', printedName: 'Goblin A' })],
      },
      { card: goblinCard, prints: [aPrint({ id: 'paper', printedName: 'Goblin B' })] },
    ]);

    const [line] = await resolveDecklist('1 Goblin', catalog, { today, lang: 'en' });

    expect(line).toMatchObject({ status: 'ambiguous' });
  });

  it('resolves a playtest-only card by name to the print its set and number name', async () => {
    const boltfire = aCard({ oracleId: 'boltfire', name: 'Boltfire' });
    const playtest = aPrint({
      id: 'mb2-559',
      set: 'mb2',
      collectorNumber: '559',
      promoTypes: ['playtest'],
    });
    const catalog = createInMemoryCatalog([{ card: boltfire, prints: [playtest] }]);

    const lines = await resolveDecklist('1 Boltfire\n1 Boltfire (MB2) 559', catalog, {
      today,
      lang: 'en',
    });

    expect(lines).toMatchObject([
      { status: 'resolved', defaultPrint: { id: 'mb2-559' } },
      { status: 'resolved', defaultPrint: { id: 'mb2-559' } },
    ]);
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

  describe('a line written with an alternate name', () => {
    const cyclonicRift = aCard({ oracleId: 'cyclonic-rift', name: 'Cyclonic Rift' });
    const regularRift = aPrint({ id: 'rift-mm3', set: 'mm3', releasedAt: '2017-03-17' });
    const newestRegularRift = aPrint({ id: 'rift-cmm', set: 'cmm', releasedAt: '2025-01-01' });
    const aeroMagicRift = aPrint({
      id: 'rift-sld',
      set: 'sld',
      collectorNumber: '1869',
      releasedAt: '2024-12-02',
      flavorName: "Hope's Aero Magic",
    });
    // Close to "Hope's Aero Magic" by trigrams, as Scryfall's Secret Lair cards are.
    const hexMagic = aCard({ oracleId: 'hex-magic', name: 'Hex Magic' });
    const catalog = createInMemoryCatalog([
      { card: cyclonicRift, prints: [regularRift, aeroMagicRift, newestRegularRift] },
      { card: hexMagic, prints: [aPrint({ id: 'hex-magic' })] },
    ]);

    it('resolves to the card, with a print carrying that name, with or without set and number', async () => {
      const lines = await resolveDecklist(
        "1 Hope's Aero Magic\n1 Hope's Aero Magic (SLD) 1869\n1 Cyclonic Rift",
        catalog,
        { today, lang: 'en' },
      );

      expect(lines).toMatchObject([
        { status: 'resolved', card: cyclonicRift, defaultPrint: { id: 'rift-sld' } },
        { status: 'resolved', card: cyclonicRift, defaultPrint: { id: 'rift-sld' } },
        { status: 'resolved', card: cyclonicRift, defaultPrint: { id: 'rift-cmm' } },
      ]);
    });

    it('picks among the prints carrying that name by the order of preference', async () => {
      const argonath = aCard({ oracleId: 'argonath', name: 'Arch of Orazca' });
      const named = (id: string, overrides: Parameters<typeof aPrint>[0]) =>
        aPrint({ id, flavorName: 'Argonath, Pillars of the Kings', ...overrides });
      const ltcCatalog = createInMemoryCatalog([
        {
          card: argonath,
          prints: [
            aPrint({ id: 'regular', releasedAt: '2026-01-01' }),
            named('ltc-351', { releasedAt: '2023-06-23' }),
            named('ltc-381', { releasedAt: '2023-06-24', oversized: true }),
            named('ltc-381z', { releasedAt: '2023-06-25', digital: true }),
          ],
        },
      ]);

      const [line] = await resolveDecklist('1 Argonath, Pillars of the Kings', ltcCatalog, {
        today,
        lang: 'en',
      });

      expect(line).toMatchObject({ status: 'resolved', defaultPrint: { id: 'ltc-351' } });
    });

    it('takes the language of the prints carrying that name, without a warning', async () => {
      const italianRift = aPrint({ id: 'rift-it', lang: 'it', releasedAt: '2025-01-01' });
      const italianCatalog = createInMemoryCatalog([
        { card: cyclonicRift, prints: [italianRift, aeroMagicRift] },
      ]);

      const [line] = await resolveDecklist("1 Hope's Aero Magic", italianCatalog, {
        today,
        lang: 'it',
      });

      expect(line).toMatchObject({
        status: 'resolved',
        lang: 'en',
        defaultPrint: { id: 'rift-sld' },
        printWarning: null,
      });
    });

    it('finds a multi-face print by its joined alternate names or by its front face', async () => {
      const kardur = aCard({ oracleId: 'kardur', name: 'Kardur, Doomscourge' });
      const chucky = aPrint({ id: 'chucky', flavorName: 'Chucky // Kardur, Doomscourge' });
      const kardurCatalog = createInMemoryCatalog([
        { card: kardur, prints: [aPrint({ id: 'regular', releasedAt: '2025-01-01' }), chucky] },
      ]);

      const lines = await resolveDecklist(
        '1 Chucky // Kardur, Doomscourge\n1 Chucky',
        kardurCatalog,
        { today, lang: 'en' },
      );

      expect(lines).toMatchObject([
        { status: 'resolved', card: kardur, defaultPrint: { id: 'chucky' } },
        { status: 'resolved', card: kardur, defaultPrint: { id: 'chucky' } },
      ]);
    });

    it('gives way to a card whose own name it is', async () => {
      const fireball = aCard({ oracleId: 'fireball', name: 'Fireball' });
      const shock = aCard({ oracleId: 'shock', name: 'Shock' });
      const fireballCatalog = createInMemoryCatalog([
        { card: shock, prints: [aPrint({ id: 'shock', flavorName: 'Fireball' })] },
        // Digital only: by the order of preference alone, the alternate name would win.
        { card: fireball, prints: [aPrint({ id: 'fireball', digital: true })] },
      ]);

      const [line] = await resolveDecklist('1 Fireball', fireballCatalog, { today, lang: 'en' });

      expect(line).toMatchObject({ status: 'resolved', card: fireball });
    });
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

describe('resolveDecklist with deck links', () => {
  const catalog = createInMemoryCatalog([{ card: solRing, prints: [solRingC21] }]);

  it('reads the web address of a deck as a deck link, naming the site it knows', async () => {
    const lines = await resolveDecklist(
      [
        'https://moxfield.com/decks/abc',
        'www.archidekt.com/decks/123/x',
        'moxfield.com/decks/abc',
        '1 https://moxfield.com/decks/abc',
        'https://www.mtggoldfish.com/deck/1',
      ].join('\n'),
      catalog,
      { today, lang: 'en' },
    );

    expect(lines).toEqual([
      {
        text: 'https://moxfield.com/decks/abc',
        status: 'deckLink',
        site: 'moxfield',
        quantity: 1,
        lang: 'en',
      },
      {
        text: 'www.archidekt.com/decks/123/x',
        status: 'deckLink',
        site: 'archidekt',
        quantity: 1,
        lang: 'en',
      },
      {
        text: 'moxfield.com/decks/abc',
        status: 'deckLink',
        site: 'moxfield',
        quantity: 1,
        lang: 'en',
      },
      {
        text: '1 https://moxfield.com/decks/abc',
        status: 'deckLink',
        site: 'moxfield',
        quantity: 1,
        lang: 'en',
      },
      {
        text: 'https://www.mtggoldfish.com/deck/1',
        status: 'deckLink',
        site: null,
        quantity: 1,
        lang: 'en',
      },
    ]);
  });

  it('knows the site of an address that names its port', async () => {
    const [line] = await resolveDecklist('https://www.moxfield.com:443/decks/abc', catalog, {
      today,
      lang: 'en',
    });

    expect(line).toMatchObject({ status: 'deckLink', site: 'moxfield' });
  });
});

describe('resolveDecklist with deck links, looking cards up', () => {
  /** A catalog that remembers every name it is asked for. */
  function recordingCatalog() {
    const catalog = createInMemoryCatalog([{ card: solRing, prints: [solRingC21] }]);
    const askedNames: string[] = [];
    return {
      askedNames,
      catalog: {
        ...catalog,
        findByNames: (names: readonly string[], options: { readonly minSimilarity: number }) => {
          askedNames.push(...names);
          return catalog.findByNames(names, options);
        },
      },
    };
  }

  it('never looks a deck link up in the catalog', async () => {
    const { catalog, askedNames } = recordingCatalog();

    await resolveDecklist(
      'https://moxfield.com/decks/abc\nmoxfield.com/decks/sol-ring\n1 Sol Ring',
      catalog,
      {
        today,
        lang: 'en',
      },
    );

    expect(askedNames).toEqual(['sol ring']);
  });

  it('looks up an address with no scheme nor "www." of a site it does not know, as a card name', async () => {
    const { catalog, askedNames } = recordingCatalog();

    const [line] = await resolveDecklist('tappedout.net/mtg-decks/x', catalog, {
      today,
      lang: 'en',
    });

    expect(line?.status).toBe('notFound');
    expect(askedNames).toEqual(['tappedout.net/mtg-decks/x']);
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
  it('changes how many copies a line prints and writes the new quantity in its text', async () => {
    const catalog = createInMemoryCatalog([{ card: solRing, prints: [solRingC21] }]);
    const [line] = await resolveDecklist('4 Sol Ring', catalog, { today, lang: 'en' });
    if (!line) throw new Error('expected a line');

    expect(setLineQuantity(line, 2)).toEqual({ ...line, quantity: 2, text: '2 Sol Ring' });
  });

  it('rewrites only the quantity, in every format a decklist line can take', async () => {
    const counterspell = aCard({ oracleId: 'counterspell', name: 'Counterspell' });
    const catalog = createInMemoryCatalog([
      { card: solRing, prints: [solRingC21] },
      { card: counterspell, prints: [aPrint({ id: 'counterspell-mh2' })] },
    ]);
    const written = ['4x Sol Ring', 'Sol Ring', 'SB: 2 Counterspell', '  1 Sol Ring (C21) 263 *F*'];
    const lines = await resolveDecklist(written.join('\n'), catalog, { today, lang: 'en' });

    expect(lines.map((line) => setLineQuantity(line, 3).text)).toEqual([
      '3x Sol Ring',
      '3 Sol Ring',
      'SB: 3 Counterspell',
      '  3 Sol Ring (C21) 263 *F*',
    ]);
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

describe('previewPrint', () => {
  it('is the default print of a line with no print chosen, and null for an unresolved one', async () => {
    const catalog = createInMemoryCatalog([{ card: solRing, prints: [solRingC21] }]);
    const [resolved, notFound] = await resolveDecklist('1 Sol Ring\n1 Xyzzy', catalog, {
      today,
      lang: 'en',
    });
    if (!resolved || !notFound) throw new Error('expected two lines');

    expect(previewPrint(resolved)?.id).toBe('sol-ring-c21');
    expect(previewPrint(notFound)).toBeNull();
  });
});

describe('copyCount', () => {
  it('counts the copies every line asks for, whether it found its card or not', async () => {
    const solRingAgain = aCard({ oracleId: 'sol-rind', name: 'Sol Rind' });
    const catalog = createInMemoryCatalog([
      { card: solRing, prints: [solRingC21] },
      { card: solRingAgain, prints: [aPrint({ id: 'sol-rind-tst' })] },
    ]);
    const lines = await resolveDecklist('4 Sol Ring\n2 Xyzzy Plover\n3 Sol Rin', catalog, {
      today,
      lang: 'en',
    });
    expect(lines.map((line) => line.status)).toEqual(['resolved', 'notFound', 'ambiguous']);

    expect(copyCount(lines)).toBe(9);
  });
});
