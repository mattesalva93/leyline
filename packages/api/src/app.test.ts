import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app.ts';
import { importBulk } from './import-bulk.ts';
import { migrate } from './db.ts';
import { bulkStream, doubleFacedCard, scryfallCard, textStream } from './scryfall-fixtures.ts';
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

  it('never defaults to digital, art series, oversized, token or playtest prints', async () => {
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
      { status: 'resolved', card: { name: 'Goblin' }, defaultPrint: null },
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

describe('GET /api/cards/:oracleId/prints', () => {
  const forest = {
    oracle_id: 'aaaaaaaa-0000-0000-0000-0000000000f0',
    name: 'Forest',
    set_type: 'expansion',
  };
  /** Forest has hundreds of prints: 60 Italian ones across 30 years, newest first by index. */
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

  it('pages through the printable prints in the asked language, newest first, with the total', async () => {
    const ids: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const query: Record<string, string> = { lang: 'it', limit: '25' };
      if (cursor) query.cursor = cursor;
      const { status, body } = await printsPage(forest.oracle_id, query);
      expect(status).toBe(200);
      expect(body.total).toBe(60);
      ids.push(...body.prints.map((print) => print.id));
      cursor = body.nextCursor;
      pages += 1;
    } while (cursor);

    expect(pages).toBe(3);
    expect(ids).toEqual(italianForests.map((card) => card.id));
  });

  it('never returns more than 50 prints in one call, whatever the client asks for', async () => {
    const { status, body } = await printsPage(forest.oracle_id, { lang: 'it', limit: '1000' });

    expect(status).toBe(200);
    expect(body.prints).toHaveLength(50);
    expect(body.total).toBe(60);
    expect(body.nextCursor).not.toBeNull();
  });

  it('returns 50 prints when the client gives no limit', async () => {
    const { body } = await printsPage(forest.oracle_id, { lang: 'it' });

    expect(body.prints).toHaveLength(50);
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
