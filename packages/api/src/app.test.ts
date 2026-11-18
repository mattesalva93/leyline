import { MAX_PRINT_QUERY_LENGTH } from '@mtg-suite/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app.ts';
import { importBulk } from './import-bulk.ts';
import { migrate } from './db.ts';
import {
  bulkStream,
  doubleFacedCard,
  imageUris,
  scryfallCard,
  textStream,
} from './scryfall-fixtures.ts';
import { createTestDb, type TestDb } from './test-db.ts';

/** A Commander deck's worth of real card names, for the 100-line batch. */
const COMMANDER_NAMES = [
  'Sol Ring',
  'Arcane Signet',
  'Command Tower',
  'Lightning Greaves',
  'Swiftfoot Boots',
  'Counterspell',
  'Swords to Plowshares',
  'Path to Exile',
  'Cultivate',
  "Kodama's Reach",
  'Rampant Growth',
  'Beast Within',
  'Chaos Warp',
  'Cyclonic Rift',
  'Rhystic Study',
  'Mystic Remora',
  'Smothering Tithe',
  'Demonic Tutor',
  'Vampiric Tutor',
  'Eternal Witness',
  'Llanowar Elves',
  'Elvish Mystic',
  'Birds of Paradise',
  'Farseek',
  "Nature's Lore",
  'Three Visits',
  'Skyshroud Claim',
  'Explosive Vegetation',
  'Harmonize',
  "Rishkar's Expertise",
  'Return of the Wildspeaker',
  'Heroic Intervention',
  "Teferi's Protection",
  'Wrath of God',
  'Damnation',
  'Toxic Deluge',
  'Blasphemous Act',
  'Vandalblast',
  'Austere Command',
  'Anguished Unmaking',
  'Generous Gift',
  "Assassin's Trophy",
  'Krosan Grip',
  'Reclamation Sage',
  'Acidic Slime',
  'Solemn Simulacrum',
  'Burnished Hart',
  "Wayfarer's Bauble",
  'Mind Stone',
  'Fellwar Stone',
  'Thought Vessel',
  "Commander's Sphere",
  'Talisman of Dominance',
  'Talisman of Progress',
  'Darksteel Ingot',
  'Worn Powerstone',
  'Thran Dynamo',
  'Gilded Lotus',
  'Basalt Monolith',
  'Chromatic Lantern',
  'Exotic Orchard',
  'Reflecting Pool',
  'Path of Ancestry',
  'Evolving Wilds',
  'Terramorphic Expanse',
  'Myriad Landscape',
  'Ash Barrens',
  'Temple of the False God',
  'Reliquary Tower',
  "Rogue's Passage",
  'Bojuka Bog',
  'Strip Mine',
  'Ghost Quarter',
  'Tectonic Edge',
  'Field of the Dead',
  'Castle Garenbrig',
  'Mosswort Bridge',
  'Kessig Wolf Run',
  'Gavony Township',
  'Grim Backwoods',
  'Llanowar Wastes',
  'Yavimaya Coast',
  'Shivan Reef',
  'Sulfurous Springs',
  'Battlefield Forge',
  'Caves of Koilos',
  'Adarkar Wastes',
  'Underground River',
  'Karplusan Forest',
  'Brushland',
  'Sungrass Prairie',
  'Canopy Vista',
  'Cinder Glade',
  'Prairie Stream',
  'Smoldering Marsh',
  'Sunken Hollow',
  'Fabled Passage',
  'Prismatic Vista',
  'Breeding Pool',
  'Overgrown Tomb',
];

let db: TestDb;

beforeAll(async () => {
  db = await createTestDb();
  await migrate(db.sql);
});

afterAll(async () => {
  await db.drop();
});

async function resolve(text: unknown, lang?: unknown) {
  const response = await createApp({ sql: db.sql }).request('/api/decklists/resolve', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text, lang }),
  });
  return { status: response.status, body: (await response.json()) as { lines: unknown[] } };
}

describe('POST /api/decklists/resolve', () => {
  it('resolves exact English names against the imported catalog', async () => {
    await importBulk(
      db.sql,
      bulkStream([
        scryfallCard({ id: 'sol-ring-c21', released_at: '2021-04-23' }),
        scryfallCard({ id: 'sol-ring-cmm', released_at: '2023-08-04', set: 'cmm' }),
        scryfallCard({ id: 'sol-ring-it', lang: 'it', released_at: '2025-01-01' }),
        doubleFacedCard({ id: 'delver-isd' }),
      ]),
    );

    const { status, body } = await resolve('4 Sol Ring\n2 delver of secrets\n1 Xyzzy Plover');

    expect(status).toBe(200);
    expect(body.lines).toMatchObject([
      {
        text: '4 Sol Ring',
        status: 'resolved',
        quantity: 4,
        card: { name: 'Sol Ring' },
        defaultPrint: {
          id: 'sol-ring-cmm',
          set: 'cmm',
          releasedAt: '2023-08-04',
          faces: [
            {
              imageUris: {
                large: expect.stringContaining('sol-ring-cmm'),
                png: 'https://cards.scryfall.io/png/front/sol-ring-cmm.png',
              },
            },
          ],
        },
      },
      {
        status: 'resolved',
        card: { name: 'Delver of Secrets // Insectile Aberration' },
        defaultPrint: {
          faces: [
            { name: 'Delver of Secrets', imageUris: { large: expect.stringContaining('front') } },
            { name: 'Insectile Aberration', imageUris: { large: expect.stringContaining('back') } },
          ],
        },
      },
      { text: '1 Xyzzy Plover', status: 'notFound' },
    ]);
  });

  it('resolves English, misspelled and Italian names, old translations included, to one card', async () => {
    const emberBeast = { oracle_id: 'aaaaaaaa-0000-0000-0000-0000000000eb', name: 'Ember Beast' };
    await importBulk(
      db.sql,
      bulkStream([
        scryfallCard({ id: 'sol-ring-c21' }),
        scryfallCard({ id: 'sol-ring-it', lang: 'it', set: 'cmm', printed_name: 'Anello Solare' }),
        scryfallCard({
          id: 'sol-talisman-mir',
          oracle_id: 'aaaaaaaa-0000-0000-0000-0000000005a1',
          name: 'Sol Talisman',
          set: 'mir',
        }),
        scryfallCard({
          id: 'ember-beast-it-old',
          ...emberBeast,
          lang: 'it',
          set: 'mrd',
          printed_name: 'Bestia Tizzone',
        }),
        scryfallCard({
          id: 'ember-beast-it',
          ...emberBeast,
          lang: 'it',
          set: 'ddl',
          printed_name: 'Bestia di Brace',
        }),
        doubleFacedCard({
          id: 'delver-it',
          lang: 'it',
          card_faces: [
            { name: 'Delver of Secrets', printed_name: 'Scopritore di Segreti' },
            { name: 'Insectile Aberration', printed_name: 'Insetto Aberrante' },
          ],
        }),
      ]),
    );

    const { body } = await resolve(
      [
        'sol ring',
        '1 sol ring',
        '1 sol rnig',
        'anello solare',
        '1 anelo solare',
        '1 Bestia Tizzone',
        '1 bestia di brace',
        '1 scopritore di segreti',
      ].join('\n'),
    );

    expect(body.lines).toMatchObject([
      ...Array(5).fill({ status: 'resolved', card: { name: 'Sol Ring' } }),
      ...Array(2).fill({ status: 'resolved', card: { name: 'Ember Beast' } }),
      { status: 'resolved', card: { name: 'Delver of Secrets // Insectile Aberration' } },
    ]);
  });

  it('uses the print an Arena line names, and suggests cards for an ambiguous one', async () => {
    await importBulk(
      db.sql,
      bulkStream([
        scryfallCard({ id: 'sol-ring-c21', set: 'c21', collector_number: '263' }),
        scryfallCard({
          id: 'sol-ring-cmm',
          set: 'cmm',
          collector_number: '410',
          released_at: '2023-08-04',
        }),
        scryfallCard({
          id: 'bolt-m11',
          oracle_id: 'aaaaaaaa-0000-0000-0000-00000000b017',
          name: 'Lightning Bolt',
          set: 'm11',
          collector_number: '149',
        }),
        scryfallCard({
          id: 'helix-rav',
          oracle_id: 'aaaaaaaa-0000-0000-0000-0000000000e1',
          name: 'Lightning Helix',
          set: 'rav',
          collector_number: '213',
        }),
      ]),
    );

    const { body } = await resolve('1 Sol Ring (C21) 263\n2 lightning');

    expect(body.lines).toMatchObject([
      { status: 'resolved', card: { name: 'Sol Ring' }, defaultPrint: { id: 'sol-ring-c21' } },
      {
        status: 'ambiguous',
        quantity: 2,
        candidates: [
          { card: { name: 'Lightning Bolt' }, defaultPrint: { id: 'bolt-m11' } },
          { card: { name: 'Lightning Helix' }, defaultPrint: { id: 'helix-rav' } },
        ],
      },
    ]);
  });

  it('resolves lines in the requested language, falling back to English with a warning', async () => {
    const counterspell = {
      oracle_id: 'aaaaaaaa-0000-0000-0000-00000000c0de',
      name: 'Counterspell',
    };
    await importBulk(
      db.sql,
      bulkStream([
        scryfallCard({ id: 'sol-ring-en', released_at: '2025-01-01' }),
        scryfallCard({
          id: 'sol-ring-it',
          lang: 'it',
          set: 'c21',
          released_at: '2021-04-23',
          printed_name: 'Anello Solare',
          image_status: 'lowres',
        }),
        scryfallCard({ id: 'counterspell-en', ...counterspell, set: 'mh2' }),
        scryfallCard({
          id: 'counterspell-it',
          ...counterspell,
          lang: 'it',
          set: 'mh2',
          printed_name: 'Contromagia',
          image_status: 'placeholder',
        }),
      ]),
    );

    const { status, body } = await resolve('1 Sol Ring\n1 Counterspell', 'it');

    expect(status).toBe(200);
    expect(body.lines).toMatchObject([
      { lang: 'it', defaultPrint: { id: 'sol-ring-it' }, printWarning: 'lowResolution' },
      { lang: 'it', defaultPrint: { id: 'counterspell-en' }, printWarning: 'languageFallback' },
    ]);
  });

  it('rejects a language the catalog does not hold', async () => {
    const { status } = await resolve('1 Sol Ring', 'ja');

    expect(status).toBe(400);
  });

  it('resolves a 100-line decklist, half of it misspelled, in one call', async () => {
    await importBulk(
      db.sql,
      bulkStream(
        COMMANDER_NAMES.map((name, i) =>
          scryfallCard({
            id: `card-${i}`,
            oracle_id: `aaaaaaaa-0000-0000-0000-${String(i).padStart(12, '0')}`,
            name,
          }),
        ),
      ),
    );
    // Every other name gets a typo (last letter typed twice): the fuzzy lookup runs on 50 names.
    const typo = (name: string) => `${name}${name.at(-1)}`;
    const decklist = COMMANDER_NAMES.map((name, i) => `1 ${i % 2 ? typo(name) : name}`);

    const { body } = await resolve(['Commander', ...decklist].join('\n'));

    expect(body.lines).toMatchObject(
      COMMANDER_NAMES.map((name) => ({ status: 'resolved', card: { name } })),
    );
  });

  it('imports only English and Italian prints', async () => {
    await importBulk(
      db.sql,
      bulkStream([
        scryfallCard({ id: 'sol-ring-en' }),
        scryfallCard({
          id: 'bolt-it',
          oracle_id: 'aaaaaaaa-0000-0000-0000-00000000b017',
          name: 'Lightning Bolt',
          lang: 'it',
          printed_name: 'Fulmine',
        }),
        scryfallCard({
          id: 'counterspell-ja',
          oracle_id: 'aaaaaaaa-0000-0000-0000-00000000c0de',
          name: 'Counterspell',
          lang: 'ja',
          printed_name: '対抗呪文',
        }),
      ]),
    );

    const { body } = await resolve('1 Sol Ring\n1 Lightning Bolt\n1 Counterspell');

    expect(body.lines).toMatchObject([
      { status: 'resolved', defaultPrint: { id: 'sol-ring-en' } },
      // Known from its Italian print, but an English line has no English print to default to.
      { status: 'resolved', card: { name: 'Lightning Bolt' }, defaultPrint: null },
      { status: 'notFound' },
    ]);
  });

  it("keeps each print's printed name, language, release date and image status", async () => {
    await importBulk(
      db.sql,
      bulkStream([
        scryfallCard({ id: 'sol-ring-lowres', released_at: '2020-04-17', image_status: 'lowres' }),
        doubleFacedCard({ id: 'delver-isd', released_at: '2011-09-30' }),
      ]),
    );

    const { body } = await resolve('1 Sol Ring\n1 Delver of Secrets');

    expect(body.lines).toMatchObject([
      {
        defaultPrint: {
          printedName: 'Sol Ring',
          lang: 'en',
          releasedAt: '2020-04-17',
          imageStatus: 'lowres',
        },
      },
      { defaultPrint: { printedName: 'Delver of Secrets // Insectile Aberration' } },
    ]);
  });

  it("keeps each print's set name and the artist of each of its faces", async () => {
    await importBulk(
      db.sql,
      bulkStream([
        scryfallCard({ id: 'sol-ring-c21', set_name: 'Commander 2021', artist: 'Mike Bierek' }),
        doubleFacedCard({
          id: 'delver-isd',
          set_name: 'Innistrad',
          artist: 'Nils Hamm // Nils Hamm',
          card_faces: [
            { name: 'Delver of Secrets', artist: 'Nils Hamm', image_uris: imageUris('front') },
            { name: 'Insectile Aberration', artist: 'Kev Walker', image_uris: imageUris('back') },
          ],
        }),
      ]),
    );

    const { body } = await resolve('1 Sol Ring\n1 Delver of Secrets');

    expect(body.lines).toMatchObject([
      { defaultPrint: { setName: 'Commander 2021', faces: [{ artist: 'Mike Bierek' }] } },
      {
        defaultPrint: {
          setName: 'Innistrad',
          faces: [{ artist: 'Nils Hamm' }, { artist: 'Kev Walker' }],
        },
      },
    ]);
  });

  it('defaults to a paper print over newer digital, art series, oversized and playtest ones, and to a token when that is all a card has', async () => {
    const newer = { released_at: '2025-06-01' };
    await importBulk(
      db.sql,
      bulkStream([
        scryfallCard({ id: 'sol-ring-paper', released_at: '2021-04-23' }),
        scryfallCard({
          id: 'sol-ring-mtgo',
          ...newer,
          set: 'prm',
          set_type: 'promo',
          digital: true,
        }),
        scryfallCard({ id: 'sol-ring-oversized', ...newer, set: 'oc21', oversized: true }),
        scryfallCard({
          id: 'sol-ring-playtest',
          ...newer,
          set: 'cmb1',
          set_type: 'funny',
          promo_types: ['playtest'],
        }),
        scryfallCard({
          id: 'sol-ring-art',
          ...newer,
          oracle_id: 'aaaaaaaa-0000-0000-0000-0000000000a7',
          name: 'Sol Ring // Sol Ring',
          set: 'ac21',
          set_type: 'memorabilia',
          layout: 'art_series',
        }),
        scryfallCard({
          id: 'goblin-token',
          ...newer,
          oracle_id: 'aaaaaaaa-0000-0000-0000-00000000060b',
          name: 'Goblin',
          set: 'tc21',
          set_type: 'token',
          layout: 'token',
        }),
      ]),
    );

    const { body } = await resolve('1 Sol Ring\n1 Goblin');

    expect(body.lines).toMatchObject([
      { status: 'resolved', card: { name: 'Sol Ring' }, defaultPrint: { id: 'sol-ring-paper' } },
      { status: 'resolved', card: { name: 'Goblin' }, defaultPrint: { id: 'goblin-token' } },
    ]);
  });

  it('serves the newest complete import, and keeps it when a later import fails', async () => {
    const counterspell = scryfallCard({
      id: 'counterspell-mh2',
      oracle_id: 'aaaaaaaa-0000-0000-0000-00000000c0de',
      name: 'Counterspell',
    });
    await importBulk(db.sql, bulkStream([scryfallCard()]));
    await importBulk(db.sql, bulkStream([counterspell]));

    const statuses = async () =>
      (await resolve('1 Sol Ring\n1 Counterspell')).body.lines.map(
        (line) => (line as { status: string }).status,
      );
    expect(await statuses()).toEqual(['notFound', 'resolved']);

    const truncated = `${JSON.stringify(scryfallCard())}\n${JSON.stringify(counterspell).slice(0, -20)}`;
    await expect(importBulk(db.sql, textStream(truncated))).rejects.toThrow();
    expect(await statuses()).toEqual(['notFound', 'resolved']);
  });

  it('rejects a body without a text decklist', async () => {
    const { status } = await resolve(42);

    expect(status).toBe(400);
  });

  it('rejects a decklist longer than 50,000 characters', async () => {
    expect((await resolve('1 Sol Ring\n'.repeat(4_546))).status).toBe(400);
    expect((await resolve('1 Sol Ring\n'.repeat(4_545))).status).toBe(200);
  });
});

async function suggestTokens(lines: unknown, lang?: unknown) {
  const response = await createApp({ sql: db.sql }).request('/api/decklists/suggested-tokens', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ lines, lang }),
  });
  return { status: response.status, body: (await response.json()) as { tokens: unknown[] } };
}

/** A Scryfall `all_parts` entry pointing at the card `id`. */
const part = (id: string, component: string, name: string) => ({
  object: 'related_card',
  id,
  component,
  name,
});

describe('POST /api/decklists/suggested-tokens', () => {
  const forgerOracle = 'aaaaaaaa-0000-0000-0000-00000000f0f0';
  const treasureOracle = 'aaaaaaaa-0000-0000-0000-00000000aaaa';
  const meldOracle = 'aaaaaaaa-0000-0000-0000-00000000be1d';
  const treasure = scryfallCard({
    id: 'treasure-tsnc',
    oracle_id: treasureOracle,
    name: 'Treasure',
    set: 'tsnc',
    collector_number: '16',
    layout: 'token',
    set_type: 'token',
    // Scryfall lists, as tokens, the token itself and other tokens that create it.
    all_parts: [
      part('treasure-tsnc', 'token', 'Treasure'),
      part('forger-snc', 'combo_piece', 'Gold Forger'),
      part('monarch-tcn2', 'token', 'The Monarch'),
    ],
  });
  const monarch = scryfallCard({
    id: 'monarch-tcn2',
    oracle_id: 'aaaaaaaa-0000-0000-0000-00000000aaab',
    name: 'The Monarch',
    set: 'tcn2',
    collector_number: '1',
    layout: 'token',
    set_type: 'token',
  });
  const forger = scryfallCard({
    id: 'forger-snc',
    oracle_id: forgerOracle,
    name: 'Gold Forger',
    set: 'snc',
    all_parts: [
      part('forger-snc', 'combo_piece', 'Gold Forger'),
      part('treasure-tsnc', 'token', 'Treasure'),
      part('monarch-tcn2', 'token', 'The Monarch'),
      part('meld-half', 'meld_part', 'Other Half'),
      part('combo-card', 'combo_piece', 'Combo Card'),
    ],
  });
  // Scryfall lists the parts of a card on its English prints only.
  const italianForger = scryfallCard({
    id: 'forger-snc-it',
    oracle_id: forgerOracle,
    name: 'Gold Forger',
    printed_name: "Forgiatore d'Oro",
    lang: 'it',
    set: 'snc',
  });
  const meldHalf = scryfallCard({ id: 'meld-half', oracle_id: meldOracle, name: 'Other Half' });
  const comboCard = scryfallCard({
    id: 'combo-card',
    oracle_id: 'aaaaaaaa-0000-0000-0000-00000000c0b0',
    name: 'Combo Card',
  });

  beforeAll(async () => {
    await importBulk(
      db.sql,
      bulkStream([italianForger, forger, treasure, monarch, meldHalf, comboCard, scryfallCard()]),
    );
  });

  it('suggests the tokens, emblems and markers a card creates, never its meld or combo pieces', async () => {
    const { status, body } = await suggestTokens([
      { oracleId: forgerOracle, previewPrintId: 'forger-snc' },
    ]);

    expect(status).toBe(200);
    expect(body.tokens).toMatchObject([
      {
        candidate: {
          card: { name: 'Treasure', powerToughnessByFace: [null], keywords: [] },
          defaultPrint: { set: 'tsnc', collectorNumber: '16' },
        },
        lang: 'en',
        createdBy: [0],
      },
      { candidate: { card: { name: 'The Monarch' } }, createdBy: [0] },
    ]);
  });

  it('suggests for an Italian print the tokens its English print of the same set and number creates', async () => {
    const { body } = await suggestTokens([
      { oracleId: forgerOracle, previewPrintId: 'forger-snc-it' },
    ]);

    expect(body.tokens).toMatchObject([
      { candidate: { card: { name: 'Treasure' } } },
      { candidate: { card: { name: 'The Monarch' } } },
    ]);
  });

  it('suggests nothing for a card that creates no token, nor for a token, whatever tokens Scryfall lists among its parts', async () => {
    const { body } = await suggestTokens([
      {
        oracleId: 'aaaaaaaa-0000-0000-0000-000000000001',
        previewPrintId: '00000000-0000-0000-0000-000000000001',
      },
      { oracleId: treasureOracle, previewPrintId: 'treasure-tsnc' },
      { oracleId: 'no-such-card', previewPrintId: null },
    ]);

    expect(body.tokens).toEqual([]);
  });

  it('rejects a body without its lines, or in a language the catalog does not hold', async () => {
    expect((await suggestTokens(42)).status).toBe(400);
    expect((await suggestTokens([{ oracleId: 42, previewPrintId: null }])).status).toBe(400);
    expect((await suggestTokens([], 'ja')).status).toBe(400);
  });
});

describe('GET /api/cards/:oracleId/prints', () => {
  const forest = {
    oracle_id: 'aaaaaaaa-0000-0000-0000-0000000000f0',
    name: 'Forest',
    set_type: 'expansion',
  };
  /** Forest has hundreds of prints: 60 Italian paper ones across 30 years, newest first by index. */
  const italianForests = Array.from({ length: 60 }, (_, index) =>
    scryfallCard({
      ...forest,
      id: `forest-it-${String(index).padStart(2, '0')}`,
      lang: 'it',
      set: `s${String(index).padStart(2, '0')}`,
      collector_number: String(250 + (index % 4)),
      released_at: `${2025 - Math.floor(index / 2)}-06-01`,
    }),
  );

  beforeAll(async () => {
    await importBulk(
      db.sql,
      bulkStream([
        ...italianForests,
        scryfallCard({ ...forest, id: 'forest-en', released_at: '2025-06-01' }),
        scryfallCard({ ...forest, id: 'forest-it-mtgo', lang: 'it', digital: true }),
      ]),
    );
  });

  async function printsPage(oracleId: string, query: Record<string, string>) {
    const params = new URLSearchParams(query);
    const response = await createApp({ sql: db.sql }).request(
      `/api/cards/${oracleId}/prints?${params}`,
    );
    return {
      status: response.status,
      body: (await response.json()) as {
        prints: { id: string; releasedAt: string }[];
        total: number;
        nextCursor: string | null;
      },
    };
  }

  it('pages through the printable prints in the asked language, paper ones first, newest first, with the total', async () => {
    const ids: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const query: Record<string, string> = { lang: 'it', limit: '25' };
      if (cursor) query.cursor = cursor;
      const { status, body } = await printsPage(forest.oracle_id, query);
      expect(status).toBe(200);
      expect(body.total).toBe(61);
      ids.push(...body.prints.map((print) => print.id));
      cursor = body.nextCursor;
      pages += 1;
    } while (cursor);

    expect(pages).toBe(3);
    expect(ids).toEqual([...italianForests.map((card) => card.id), 'forest-it-mtgo']);
  });

  it('never returns more than 50 prints in one call, whatever the client asks for', async () => {
    const { status, body } = await printsPage(forest.oracle_id, { lang: 'it', limit: '1000' });

    expect(status).toBe(200);
    expect(body.prints).toHaveLength(50);
    expect(body.total).toBe(61);
    expect(body.nextCursor).not.toBeNull();
  });

  it('returns 50 prints when the client gives no limit', async () => {
    const { body } = await printsPage(forest.oracle_id, { lang: 'it' });

    expect(body.prints).toHaveLength(50);
  });

  it('pages through only the prints a print query finds, counting only them', async () => {
    const first = await printsPage(forest.oracle_id, { lang: 'it', limit: '2', q: 'S0 251' });
    const second = await printsPage(forest.oracle_id, {
      lang: 'it',
      limit: '2',
      q: 'S0 251',
      cursor: first.body.nextCursor ?? '',
    });

    expect([first, second].map(({ body }) => body.prints.map((print) => print.id))).toEqual([
      ['forest-it-01', 'forest-it-05'],
      ['forest-it-09'],
    ]);
    expect([first, second].map(({ body }) => body.total)).toEqual([3, 3]);
  });

  it('takes a print query naming the longest set name and artist name together', async () => {
    const longest = [
      'The Lord of the Rings: Tales of Middle-earth Minigames',
      'Poison Project (USE ANDITYA DITA INSTEAD)',
      'ltr 1234★ 2023 startercollection',
    ].join(' ');

    expect((await printsPage(forest.oracle_id, { lang: 'it', q: longest })).status).toBe(200);
  });

  it('rejects a print query longer than any search the names call for', async () => {
    const tooLong = 's'.repeat(MAX_PRINT_QUERY_LENGTH + 1);

    expect((await printsPage(forest.oracle_id, { lang: 'it', q: tooLong })).status).toBe(400);
  });

  it('rejects a limit, cursor or language it cannot read', async () => {
    const id = forest.oracle_id;
    expect((await printsPage(id, { lang: 'it', limit: '0' })).status).toBe(400);
    expect((await printsPage(id, { lang: 'it', limit: 'ten' })).status).toBe(400);
    expect((await printsPage(id, { lang: 'it', cursor: 'nope' })).status).toBe(400);
    expect((await printsPage(id, { lang: 'fr' })).status).toBe(400);
  });

  it('answers 404 for a card the catalog does not hold', async () => {
    const { status } = await printsPage('aaaaaaaa-0000-0000-0000-00000000dead', { lang: 'it' });

    expect(status).toBe(404);
  });
});

describe('GET /api/cards/search', () => {
  const counterspell = { oracle_id: 'aaaaaaaa-0000-0000-0000-00000000c0de', name: 'Counterspell' };
  /**
   * Twelve cards whose name starts with "Forest Card": more than one search returns. Their last
   * letters, G to R, share no trigram with "forest card", so every name is as close to it.
   */
  const forestCards = Array.from({ length: 12 }, (_, index) =>
    scryfallCard({
      id: `forest-card-${index}`,
      oracle_id: `aaaaaaaa-0000-0000-0000-0000000f00${String(index).padStart(2, '0')}`,
      name: `Forest Card ${String.fromCharCode(71 + index)}`,
    }),
  );

  beforeAll(async () => {
    await importBulk(
      db.sql,
      bulkStream([
        scryfallCard({ id: 'counterspell-en', ...counterspell, set: 'mh2' }),
        scryfallCard({
          id: 'counterspell-it',
          ...counterspell,
          lang: 'it',
          set: 'mh2',
          printed_name: 'Contromagia',
        }),
        ...forestCards,
      ]),
    );
  });

  async function search(query: Record<string, string>) {
    const response = await createApp({ sql: db.sql }).request(
      `/api/cards/search?${new URLSearchParams(query)}`,
    );
    return {
      status: response.status,
      body: (await response.json()) as {
        cards: { card: { name: string }; defaultPrint: { id: string } | null }[];
      },
    };
  }

  it('finds a card by its English name, with its default print in the asked language', async () => {
    const { status, body } = await search({ q: 'counterspell', lang: 'it' });

    expect(status).toBe(200);
    expect(body.cards).toMatchObject([
      { card: { name: 'Counterspell' }, defaultPrint: { id: 'counterspell-it' } },
    ]);
  });

  it('finds a card by its Italian name', async () => {
    const { body } = await search({ q: 'Contromagia', lang: 'en' });

    expect(body.cards).toMatchObject([
      { card: { name: 'Counterspell' }, defaultPrint: { id: 'counterspell-en' } },
    ]);
  });

  it('forgives a misspelled name', async () => {
    const { body } = await search({ q: 'contrspell', lang: 'en' });

    expect(body.cards.map((found) => found.card.name)).toEqual(['Counterspell']);
  });

  it('finds the cards whose name starts with what the user has typed so far', async () => {
    const { body } = await search({ q: 'contro', lang: 'it' });

    expect(body.cards.map((found) => found.card.name)).toEqual(['Counterspell']);
  });

  it('returns no card when no name comes close', async () => {
    const { status, body } = await search({ q: 'xyzzy plover', lang: 'en' });

    expect(status).toBe(200);
    expect(body.cards).toEqual([]);
  });

  it('returns 8 cards at most, closest first', async () => {
    const { body } = await search({ q: 'forest card', lang: 'en' });

    expect(body.cards.map((found) => found.card.name)).toEqual(
      forestCards.slice(0, 8).map((card) => card.name),
    );
  });

  it('rejects a search without a name, or in a language the catalog does not hold', async () => {
    expect((await search({ lang: 'en' })).status).toBe(400);
    expect((await search({ q: '  ', lang: 'en' })).status).toBe(400);
    expect((await search({ q: 'x'.repeat(201), lang: 'en' })).status).toBe(400);
    expect((await search({ q: 'counterspell', lang: 'fr' })).status).toBe(400);
  });
});

describe('the characteristics of a card', () => {
  const token = { layout: 'token', set_type: 'token' };
  const firebendingSoldier = scryfallCard({
    id: 'soldier-ttla-11',
    oracle_id: 'aaaaaaaa-0000-0000-0000-00000050d122',
    name: 'Soldier',
    set: 'ttla',
    collector_number: '11',
    ...token,
    power: '2',
    toughness: '2',
    keywords: ['Firebending'],
  });
  const lifelinkSoldier = scryfallCard({
    id: 'soldier-plst-tgrn-2',
    oracle_id: 'aaaaaaaa-0000-0000-0000-00000050d111',
    name: 'Soldier',
    set: 'plst',
    collector_number: 'TGRN-2',
    ...token,
    power: '1',
    toughness: '1',
    keywords: ['Lifelink'],
  });

  const soldierGoblin = doubleFacedCard({
    id: 'soldier-goblin-sld',
    oracle_id: 'aaaaaaaa-0000-0000-0000-00000050d6b1',
    name: 'Soldier // Goblin',
    set: 'sld',
    collector_number: '1',
    layout: 'double_faced_token',
    set_type: 'box',
    card_faces: [
      { name: 'Soldier', power: '1', toughness: '1', image_uris: imageUris('soldier') },
      { name: 'Goblin', power: '1', toughness: '1', image_uris: imageUris('goblin') },
    ],
  });
  const treasure = scryfallCard({
    id: 'treasure-tsnc-16',
    oracle_id: 'aaaaaaaa-0000-0000-0000-0000007ea500',
    name: 'Treasure',
    set: 'tsnc',
    collector_number: '16',
    ...token,
    keywords: [],
  });
  const emblem = scryfallCard({
    id: 'emblem-elspeth',
    oracle_id: 'aaaaaaaa-0000-0000-0000-0000000e1b00',
    name: "Elspeth, Sun's Champion Emblem",
    set: 'tths',
    collector_number: '5',
    layout: 'emblem',
    set_type: 'token',
    keywords: [],
  });
  const tarmogoyf = scryfallCard({
    id: 'tarmogoyf-mh2',
    oracle_id: 'aaaaaaaa-0000-0000-0000-0000000060f0',
    name: 'Tarmogoyf',
    set: 'mh2',
    collector_number: '177',
    power: '*',
    toughness: '1+*',
  });

  const delver = doubleFacedCard({
    keywords: ['Flying', 'Transform'],
    card_faces: [
      {
        name: 'Delver of Secrets',
        power: '1',
        toughness: '1',
        image_uris: imageUris('delver-front'),
      },
      {
        name: 'Insectile Aberration',
        power: '3',
        toughness: '2',
        image_uris: imageUris('delver-back'),
      },
    ],
  });

  beforeAll(async () => {
    await importBulk(
      db.sql,
      bulkStream([
        firebendingSoldier,
        lifelinkSoldier,
        soldierGoblin,
        treasure,
        emblem,
        tarmogoyf,
        delver,
      ]),
    );
  });

  it('keeps the power, toughness and keywords of each card', async () => {
    const { body } = await resolve('1 Soldier (TTLA) 11\n1 Soldier (PLST) TGRN-2');

    expect(body.lines).toMatchObject([
      {
        status: 'resolved',
        card: {
          powerToughnessByFace: [{ power: '2', toughness: '2' }],
          keywords: ['Firebending'],
        },
      },
      {
        status: 'resolved',
        card: { powerToughnessByFace: [{ power: '1', toughness: '1' }], keywords: ['Lifelink'] },
      },
    ]);
  });

  it('keeps power and toughness as Scryfall writes them, as text', async () => {
    const { body } = await resolve('1 Tarmogoyf');

    expect(body.lines).toMatchObject([
      { card: { powerToughnessByFace: [{ power: '*', toughness: '1+*' }] } },
    ]);
  });

  it('gives no power or toughness to a card without them, such as a Treasure or an emblem', async () => {
    const { status, body } = await resolve("1 Treasure\n1 Elspeth, Sun's Champion Emblem");

    expect(status).toBe(200);
    expect(body.lines).toMatchObject([
      { status: 'resolved', card: { powerToughnessByFace: [null], keywords: [] } },
      { status: 'resolved', card: { powerToughnessByFace: [null], keywords: [] } },
    ]);
  });

  it('keeps the power and toughness of each face of a double-faced card, token or not, in face order', async () => {
    const { body } = await resolve('1 Soldier // Goblin\n1 Delver of Secrets');

    expect(body.lines).toMatchObject([
      {
        status: 'resolved',
        card: {
          name: 'Soldier // Goblin',
          powerToughnessByFace: [
            { power: '1', toughness: '1' },
            { power: '1', toughness: '1' },
          ],
        },
      },
      {
        status: 'resolved',
        card: {
          powerToughnessByFace: [
            { power: '1', toughness: '1' },
            { power: '3', toughness: '2' },
          ],
          keywords: ['Flying', 'Transform'],
        },
      },
    ]);
  });

  it('returns the characteristics on the cards a search finds', async () => {
    const response = await createApp({ sql: db.sql }).request('/api/cards/search?q=tarmogoyf');

    expect(await response.json()).toMatchObject({
      cards: [
        { card: { name: 'Tarmogoyf', powerToughnessByFace: [{ power: '*', toughness: '1+*' }] } },
      ],
    });
  });
});

describe('GET /api/health', () => {
  it('answers ok, so the compose healthcheck can tell a serving api', async () => {
    const response = await createApp({ sql: db.sql }).request('/api/health');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });
});

describe('GET /api/cards/:oracleId/print-counts', () => {
  const trinisphere = {
    oracle_id: 'aaaaaaaa-0000-0000-0000-0000000000a3',
    name: 'Trinisphere',
    set_type: 'expansion',
  };

  beforeAll(async () => {
    await importBulk(
      db.sql,
      bulkStream([
        scryfallCard({
          ...trinisphere,
          id: 'trinisphere-dst-it',
          lang: 'it',
          set: 'dst',
          image_status: 'placeholder',
        }),
        scryfallCard({ ...trinisphere, id: 'trinisphere-dst', set: 'dst' }),
        scryfallCard({ ...trinisphere, id: 'trinisphere-sld', set: 'sld' }),
      ]),
    );
  });

  async function printCounts(oracleId: string) {
    const response = await createApp({ sql: db.sql }).request(
      `/api/cards/${oracleId}/print-counts`,
    );
    return { status: response.status, body: (await response.json()) as unknown };
  }

  it('counts the printable prints of each language, an Italian placeholder not among them', async () => {
    const { status, body } = await printCounts(trinisphere.oracle_id);

    expect(status).toBe(200);
    expect(body).toEqual({ it: 0, en: 2 });
  });

  it('answers 404 for a card the catalog does not hold', async () => {
    const { status } = await printCounts('aaaaaaaa-0000-0000-0000-00000000dead');

    expect(status).toBe(404);
  });
});

describe('a catalog imported before set names, artists and card characteristics', () => {
  let oldDb: TestDb;

  beforeAll(async () => {
    oldDb = await createTestDb();
    await migrate(oldDb.sql);
    // The catalog as an older import left it: no set name column, faces without an artist,
    // cards without their characteristics.
    await oldDb.sql`alter table prints drop column set_name`;
    await oldDb.sql`alter table cards drop column power_toughness_by_face, drop column keywords`;
    await oldDb.sql`insert into cards values ('forest', 'Forest')`;
    await oldDb.sql`insert into card_names values ('forest', 'forest')`;
    await oldDb.sql`
      insert into prints values (
        'forest-old', 'forest', 'lea', '294', 'en', 'Forest', '1993-08-05', 'highres_scan',
        false, false, 'normal', 'expansion', '{}',
        ${oldDb.sql.json([{ name: 'Forest', imageUris: imageUris('forest-old') }])}
      )
    `;
  });

  afterAll(async () => {
    await oldDb.drop();
  });

  it('serves its prints with an empty set name and artist once migrated', async () => {
    await migrate(oldDb.sql);

    const response = await createApp({ sql: oldDb.sql }).request('/api/cards/forest/prints');

    expect(await response.json()).toMatchObject({
      prints: [{ id: 'forest-old', setName: '', faces: [{ name: 'Forest', artist: '' }] }],
    });
  });

  it('serves its cards with no power, toughness or keywords once migrated', async () => {
    await migrate(oldDb.sql);

    const response = await createApp({ sql: oldDb.sql }).request('/api/cards/search?q=forest');

    expect(await response.json()).toMatchObject({
      cards: [{ card: { name: 'Forest', powerToughnessByFace: [], keywords: [] } }],
    });
  });
});
