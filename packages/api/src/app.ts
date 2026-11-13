import {
  CARD_SEARCH_LIMIT,
  isLang,
  isPrintCursor,
  listPrints,
  resolveDecklist,
  searchCards,
  type Lang,
} from '@mtg-suite/core';
import { Hono } from 'hono';
import type { Sql } from './db.ts';
import { createPostgresCatalog } from './postgres-catalog.ts';

export interface AppDeps {
  readonly sql: Sql;
}

/** Longest decklist text accepted, in characters: far above a 100-card deck. */
const MAX_DECKLIST_LENGTH = 50_000;

/** Most prints one call returns, whatever the client asks for: keeps every response small. */
const MAX_PRINTS_PER_PAGE = 50;

/** Longest name a search accepts, in characters: far above any card name. */
const MAX_SEARCH_LENGTH = 200;

const POSITIVE_INTEGER = /^[1-9]\d*$/;

/** The UTC date, like Scryfall's release dates. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

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
    const lines = await resolveDecklist(request.text, catalog, {
      today: today(),
      lang: request.lang,
    });
    return c.json({ lines });
  });

  app.get('/api/cards/search', async (c) => {
    const { q, lang = 'en' } = c.req.query();
    if (q === undefined || q.trim() === '' || q.length > MAX_SEARCH_LENGTH || !isLang(lang)) {
      return c.json(
        {
          error: `Expected the query ?q=<a name of up to ${MAX_SEARCH_LENGTH} characters>&lang=en|it.`,
        },
        400,
      );
    }
    const cards = await searchCards(catalog, {
      query: q,
      lang,
      today: today(),
      limit: CARD_SEARCH_LIMIT,
    });
    return c.json({ cards });
  });

  app.get('/api/cards/:oracleId/prints', async (c) => {
    const { lang = 'en', limit, cursor } = c.req.query();
    const limitIsValid = limit === undefined || POSITIVE_INTEGER.test(limit);
    if (!isLang(lang) || !limitIsValid || (cursor !== undefined && !isPrintCursor(cursor))) {
      return c.json(
        {
          error:
            'Expected the query ?lang=en|it&limit=<whole number of at least 1>&cursor=<nextCursor of the previous page>.',
        },
        400,
      );
    }
    const page = await listPrints(catalog, {
      oracleId: c.req.param('oracleId'),
      lang,
      today: today(),
      limit: Math.min(Number(limit ?? MAX_PRINTS_PER_PAGE), MAX_PRINTS_PER_PAGE),
      cursor,
    });
    if (!page) return c.json({ error: 'No card has this oracle id.' }, 404);
    return c.json(page);
  });

  return app;
}
