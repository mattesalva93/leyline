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
