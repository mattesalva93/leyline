import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app.ts';
import { migrate } from '../catalog/db.ts';
import { listen, type ListeningApp } from '../test-support/listening-app.ts';
import { manualClock } from '../test-support/manual-clock.ts';
import { recordedSecurityLog } from '../test-support/recorded-security-log.ts';
import { createTestDb, type TestDb } from '../test-support/test-db.ts';

const MIB = 1024 * 1024;

let db: TestDb;
let server: ListeningApp | undefined;

beforeAll(async () => {
  db = await createTestDb();
  await migrate(db.sql);
});

afterEach(async () => {
  await server?.close();
  server = undefined;
});

afterAll(async () => {
  await db.drop();
});

/** The app over a real socket, with a clock and a security log the test holds. */
async function serveApp(sql = db.sql) {
  const clock = manualClock();
  const securityLog = recordedSecurityLog();
  server = await listen(createApp({ sql, clock, securityLog }));
  return { origin: server.origin, clock, securityLog };
}

describe('the request body limit', () => {
  it('refuses a body announced over 1 MiB with 413, before reading it', async () => {
    const { origin, securityLog } = await serveApp();

    const response = await fetch(`${origin}/api/decklists/resolve`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'x'.repeat(MIB) }),
    });

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: 'The request body is over 1 MiB.' });
    expect(securityLog.events).toEqual([
      {
        kind: 'body-too-large',
        method: 'POST',
        path: '/api/decklists/resolve',
        clientNetwork: '127.0.0.0',
      },
    ]);
  });

  it('stops reading a body streamed without a length once it passes 1 MiB', async () => {
    const { origin } = await serveApp();
    const chunk = new TextEncoder().encode('x'.repeat(64 * 1024));
    const streamedBytes = 64 * MIB;
    let sentBytes = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (sentBytes >= streamedBytes) return controller.close();
        sentBytes += chunk.length;
        controller.enqueue(chunk);
      },
    });

    const response = await fetch(`${origin}/api/decklists/resolve`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      duplex: 'half',
    } as RequestInit);

    expect(response.status).toBe(413);
    expect(sentBytes).toBeLessThan(streamedBytes);
  });

  it('reads the longest decklist accepted, written in accented letters', async () => {
    const { origin } = await serveApp();

    const response = await post(origin, '/api/decklists/resolve', { text: 'à'.repeat(50_000) });

    expect(response.status).toBe(200);
  });

  it('reads the longest token suggestion accepted', async () => {
    const { origin } = await serveApp();
    const lines = Array.from({ length: 5_000 }, () => ({
      oracleId: randomUUID(),
      previewPrintId: randomUUID(),
    }));

    const response = await post(origin, '/api/decklists/suggested-tokens', { lines, lang: 'it' });

    expect(response.status).toBe(200);
  });
});

function post(origin: string, path: string, body: unknown): Promise<Response> {
  return fetch(`${origin}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}
