import { resolveDecklist } from '@mtg-suite/core';
import { Hono } from 'hono';
import type { Sql } from './db.ts';
import { createPostgresCatalog } from './postgres-catalog.ts';

export interface AppDeps {
  readonly sql: Sql;
}

/** Longest decklist text accepted, in characters: far above a 100-card deck. */
const MAX_DECKLIST_LENGTH = 50_000;

export function createApp(deps: AppDeps): Hono {
  const catalog = createPostgresCatalog(deps.sql);
  const app = new Hono();

  app.get('/api/health', (c) => c.json({ ok: true }));

  app.post('/api/decklists/resolve', async (c) => {
    const body: unknown = await c.req.json().catch(() => null);
    const text = typeof body === 'object' && body !== null && 'text' in body ? body.text : null;
    if (typeof text !== 'string' || text.length > MAX_DECKLIST_LENGTH) {
      return c.json(
        { error: 'Expected a JSON body { "text": string } up to 50,000 characters.' },
        400,
      );
    }
    const today = new Date().toISOString().slice(0, 10); // UTC date, like Scryfall's
    return c.json({ lines: await resolveDecklist(text, catalog, { today, lang: 'en' }) });
  });

  return app;
}
