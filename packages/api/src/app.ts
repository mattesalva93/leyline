import { isLang, resolveDecklist, type Lang } from '@mtg-suite/core';
import { Hono } from 'hono';
import type { Sql } from './db.ts';
import { createPostgresCatalog } from './postgres-catalog.ts';

export interface AppDeps {
  readonly sql: Sql;
}

/** Longest decklist text accepted, in characters: far above a 100-card deck. */
const MAX_DECKLIST_LENGTH = 50_000;

/** `{ text, lang? }` from a resolve request body, or `null` when it is not one. */
function resolveRequest(body: unknown): { text: string; lang: Lang } | null {
  if (typeof body !== 'object' || body === null) return null;
  const { text, lang = 'en' } = body as { text?: unknown; lang?: unknown };
  if (typeof text !== 'string' || text.length > MAX_DECKLIST_LENGTH) return null;
  return isLang(lang) ? { text, lang } : null;
}

export function createApp(deps: AppDeps): Hono {
  const catalog = createPostgresCatalog(deps.sql);
  const app = new Hono();

  app.get('/api/health', (c) => c.json({ ok: true }));

  app.post('/api/decklists/resolve', async (c) => {
    const request = resolveRequest(await c.req.json().catch(() => null));
    if (!request) {
      return c.json(
        {
          error:
            'Expected a JSON body { "text": string up to 50,000 characters, "lang"?: "en" | "it" }.',
        },
        400,
      );
    }
    const today = new Date().toISOString().slice(0, 10); // UTC date, like Scryfall's
    const lines = await resolveDecklist(request.text, catalog, { today, lang: request.lang });
    return c.json({ lines });
  });

  return app;
}
