import {
  CARD_SEARCH_LIMIT,
  countPrintsByLang,
  isLang,
  isPrintCursor,
  listCardsNamed,
  listPrints,
  MAX_PRINT_QUERY_LENGTH,
  resolveDecklist,
  searchCards,
  suggestTokens,
  type Lang,
  type TokenQueryLine,
} from '@leyline/core';
import { Hono } from 'hono';
import { hasCatalogTables, type Sql } from '../catalog/db.ts';
import { createPostgresCatalog } from '../catalog/postgres-catalog.ts';
import { clientAddress } from './client-address.ts';
import type { Clock } from './clock.ts';
import { rateLimit } from './rate-limit.ts';
import { requestBodyLimit } from './request-body-limit.ts';
import { requestTimeout } from './request-timeout.ts';
import type { SecurityLog } from './security-log.ts';
import { serverErrorHandler } from './server-error-handler.ts';

interface AppDeps {
  readonly sql: Sql;
  readonly clock: Clock;
  readonly securityLog: SecurityLog;
  /** The reverse proxy whose `X-Forwarded-For` is believed (Caddy), or `null` to believe none. */
  readonly trustedProxyHost: string | null;
}

/** Longest decklist text accepted, in characters: far above a 100-card deck. */
const MAX_DECKLIST_LENGTH = 50_000;

/** Most prints one call returns, whatever the client asks for: keeps every response small. */
const MAX_PRINTS_PER_PAGE = 50;

/** Longest name a search or a same-name listing accepts, in characters: far above any card name. */
const MAX_NAME_LENGTH = 200;

/** Most lines a token suggestion takes: far above a 100-card deck. */
const MAX_TOKEN_QUERY_LINES = 5_000;

/** Longest Scryfall id accepted: they are 36-character UUIDs. */
const MAX_ID_LENGTH = 64;

/** Far above what a tester typing card names sends, far below what a script can. */
const SEARCH_RATE_LIMIT = { requestsPerWindow: 120, windowSeconds: 60 };

/** Far above how often a tester pastes or edits a decklist, far below what a script can. */
const RESOLVE_RATE_LIMIT = { requestsPerWindow: 30, windowSeconds: 60 };

/** A listing is asked for each card a search picks: as often as searches. */
const CARDS_NAMED_RATE_LIMIT = SEARCH_RATE_LIMIT;

/**
 * Asked again whenever the decklist or a print in it changes: above a tester picking a print on
 * every tile of a 100-card deck within a minute, below a script scanning the catalog.
 */
const SUGGESTED_TOKENS_RATE_LIMIT = { requestsPerWindow: 120, windowSeconds: 60 };

/**
 * Cheap reads of one card, asked each time a tile opens, its picker scrolls or its print query
 * changes: above a tester opening every tile of a 100-card deck within a minute, and paging on.
 */
const ONE_CARD_PRINTS_RATE_LIMIT = { requestsPerWindow: 300, windowSeconds: 60 };

const POSITIVE_INTEGER = /^[1-9]\d*$/;

/** `{ text, lang? }` from a resolve request body, or `null` when it is not one. */
function resolveRequest(body: unknown): { text: string; lang: Lang } | null {
  if (typeof body !== 'object' || body === null) return null;
  const { text, lang = 'en' } = body as { text?: unknown; lang?: unknown };
  if (typeof text !== 'string' || text.length > MAX_DECKLIST_LENGTH) return null;
  return isLang(lang) ? { text, lang } : null;
}

/** Whether a card name asked in a query is neither blank nor longer than `MAX_NAME_LENGTH`. */
function isValidNameQuery(value: string | undefined): value is string {
  return value !== undefined && value.trim() !== '' && value.length <= MAX_NAME_LENGTH;
}

/** The 400 body of a request whose `param` or `lang` query is missing or wrong. */
function nameQueryError(param: string): { error: string } {
  return {
    error: `Expected the query ?${param}=<a name of up to ${MAX_NAME_LENGTH} characters>&lang=en|it.`,
  };
}

function isId(value: unknown): value is string {
  return typeof value === 'string' && value.length <= MAX_ID_LENGTH;
}

const ORACLE_ID_ERROR = { error: `Expected an oracle id of up to ${MAX_ID_LENGTH} characters.` };

function isTokenQueryLine(value: unknown): value is TokenQueryLine {
  if (typeof value !== 'object' || value === null) return false;
  const { oracleId, previewPrintId } = value as Partial<Record<keyof TokenQueryLine, unknown>>;
  return isId(oracleId) && (previewPrintId === null || isId(previewPrintId));
}

/** `{ lines, lang? }` from a token suggestion request body, or `null` when it is not one. */
function tokenSuggestionRequest(body: unknown): { lines: TokenQueryLine[]; lang: Lang } | null {
  if (typeof body !== 'object' || body === null) return null;
  const { lines, lang = 'en' } = body as { lines?: unknown; lang?: unknown };
  if (!Array.isArray(lines) || lines.length > MAX_TOKEN_QUERY_LINES) return null;
  return lines.every(isTokenQueryLine) && isLang(lang) ? { lines, lang } : null;
}

export function createApp(deps: AppDeps): Hono {
  const catalog = createPostgresCatalog(deps.sql);
  const app = new Hono();
  /** The UTC date, like Scryfall's release dates. */
  const today = () => deps.clock.now().toISOString().slice(0, 10);

  app.onError(serverErrorHandler(deps.securityLog));
  app.use('/api/*', clientAddress(deps.trustedProxyHost, deps.clock));
  app.use('/api/*', requestTimeout(deps.clock, deps.securityLog));
  app.use('/api/*', requestBodyLimit(deps.securityLog));

  // The importer creates the schema (ADR 0016): until then the API has nothing to serve.
  app.get('/api/health', async (c) =>
    (await hasCatalogTables(deps.sql))
      ? c.json({ ok: true })
      : c.json({ error: 'The catalog schema does not exist yet: the importer creates it.' }, 503),
  );

  app.post(
    '/api/decklists/resolve',
    rateLimit(RESOLVE_RATE_LIMIT, deps.clock, deps.securityLog),
    async (c) => {
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
    },
  );

  app.post(
    '/api/decklists/suggested-tokens',
    rateLimit(SUGGESTED_TOKENS_RATE_LIMIT, deps.clock, deps.securityLog),
    async (c) => {
      const request = tokenSuggestionRequest(await c.req.json().catch(() => null));
      if (!request) {
        return c.json(
          {
            error: `Expected a JSON body { "lines": up to ${MAX_TOKEN_QUERY_LINES} of { "oracleId": string, "previewPrintId": string | null }, "lang"?: "en" | "it" }.`,
          },
          400,
        );
      }
      const tokens = await suggestTokens(catalog, request.lines, {
        today: today(),
        lang: request.lang,
      });
      return c.json({ tokens });
    },
  );

  app.get(
    '/api/cards/search',
    rateLimit(SEARCH_RATE_LIMIT, deps.clock, deps.securityLog),
    async (c) => {
      const { q, lang = 'en' } = c.req.query();
      if (!isValidNameQuery(q) || !isLang(lang)) return c.json(nameQueryError('q'), 400);
      const cards = await searchCards(catalog, {
        query: q,
        lang,
        today: today(),
        limit: CARD_SEARCH_LIMIT,
      });
      return c.json({ cards });
    },
  );

  app.get(
    '/api/cards/named',
    rateLimit(CARDS_NAMED_RATE_LIMIT, deps.clock, deps.securityLog),
    async (c) => {
      const { name, lang = 'en' } = c.req.query();
      if (!isValidNameQuery(name) || !isLang(lang)) return c.json(nameQueryError('name'), 400);
      const cards = await listCardsNamed(catalog, { name, lang, today: today() });
      return c.json({ cards });
    },
  );

  app.get(
    '/api/cards/:oracleId/prints',
    rateLimit(ONE_CARD_PRINTS_RATE_LIMIT, deps.clock, deps.securityLog),
    async (c) => {
      const oracleId = c.req.param('oracleId');
      if (!isId(oracleId)) return c.json(ORACLE_ID_ERROR, 400);
      const { lang = 'en', limit, cursor, q } = c.req.query();
      const limitIsValid = limit === undefined || POSITIVE_INTEGER.test(limit);
      const cursorIsValid = cursor === undefined || isPrintCursor(cursor);
      const queryIsValid = q === undefined || q.length <= MAX_PRINT_QUERY_LENGTH;
      if (!isLang(lang) || !limitIsValid || !cursorIsValid || !queryIsValid) {
        return c.json(
          {
            error: `Expected the query ?lang=en|it&limit=<whole number of at least 1>&cursor=<nextCursor of the previous page>&q=<a print query of up to ${MAX_PRINT_QUERY_LENGTH} characters>.`,
          },
          400,
        );
      }
      const page = await listPrints(catalog, {
        oracleId,
        lang,
        today: today(),
        limit: Math.min(Number(limit ?? MAX_PRINTS_PER_PAGE), MAX_PRINTS_PER_PAGE),
        cursor,
        query: q,
      });
      if (!page) return c.json({ error: 'No card has this oracle id.' }, 404);
      return c.json(page);
    },
  );

  app.get(
    '/api/cards/:oracleId/print-counts',
    rateLimit(ONE_CARD_PRINTS_RATE_LIMIT, deps.clock, deps.securityLog),
    async (c) => {
      const oracleId = c.req.param('oracleId');
      if (!isId(oracleId)) return c.json(ORACLE_ID_ERROR, 400);
      const counts = await countPrintsByLang(catalog, {
        oracleId,
        today: today(),
      });
      if (!counts) return c.json({ error: 'No card has this oracle id.' }, 404);
      return c.json(counts);
    },
  );

  return app;
}
