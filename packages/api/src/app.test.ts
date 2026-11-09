import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app.ts';
import { importBulk } from './import-bulk.ts';
import { migrate } from './db.ts';
import { bulkStream, doubleFacedCard, scryfallCard, textStream } from './scryfall-fixtures.ts';
import { createTestDb, type TestDb } from './test-db.ts';

let db: TestDb;

beforeAll(async () => {
  db = await createTestDb();
  await migrate(db.sql);
});

afterAll(async () => {
  await db.drop();
});

async function resolve(text: unknown) {
  const response = await createApp({ sql: db.sql }).request('/api/decklists/resolve', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text }),
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

    const { status, body } = await resolve('4 Sol Ring\n2 delver of secrets\n1 Sol Rnig');

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
          faces: [{ imageUris: { large: expect.stringContaining('sol-ring-cmm') } }],
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
      { text: '1 Sol Rnig', status: 'notFound' },
    ]);
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
