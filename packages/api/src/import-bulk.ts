// Streams a Scryfall bulk file into the catalog and swaps it in atomically (ADR 0002).
import {
  cardKeys,
  isTokenLayout,
  type ImageUris,
  type PowerToughness,
  type PrintFace,
} from '@mtg-suite/core';
import type { Readable } from 'node:stream';
import { createInterface } from 'node:readline';
import { createCatalogTables, type Sql } from './db.ts';

/** ADR 0002: the catalog holds English and Italian prints only. */
const LANGS = new Set(['en', 'it']);
const BATCH_SIZE = 1000;
/**
 * Advisory lock key held for a whole import, since imports share the staging tables. Any
 * constant unique to this app works; this one spells "MTG1" in ASCII.
 */
const IMPORT_LOCK = 0x4d544731;

interface ScryfallImageUris {
  readonly small: string;
  readonly normal: string;
  readonly large: string;
  readonly png: string;
}

interface ScryfallFace {
  readonly name: string;
  readonly artist?: string;
  readonly printed_name?: string;
  readonly oracle_id?: string;
  readonly power?: string;
  readonly toughness?: string;
  readonly image_uris?: ScryfallImageUris;
}

/** A card Scryfall relates to another one: a token it creates, a meld or combo piece. */
interface ScryfallRelatedCard {
  readonly id: string;
  readonly component: string;
}

/** The fields of a Scryfall card object the import reads. */
interface ScryfallCard {
  readonly id: string;
  readonly oracle_id?: string;
  readonly name: string;
  readonly artist?: string;
  readonly lang: string;
  readonly printed_name?: string;
  readonly released_at: string;
  readonly set: string;
  readonly set_name: string;
  readonly set_type: string;
  readonly promo_types?: readonly string[];
  readonly collector_number: string;
  readonly digital: boolean;
  readonly oversized: boolean;
  readonly layout: string;
  readonly power?: string;
  readonly toughness?: string;
  readonly keywords?: readonly string[];
  readonly image_status: string;
  readonly image_uris?: ScryfallImageUris;
  readonly card_faces?: readonly ScryfallFace[];
  readonly all_parts?: readonly ScryfallRelatedCard[];
}

interface CardRow {
  readonly oracle_id: string;
  readonly name: string;
  readonly power_toughness_by_face: readonly (PowerToughness | null)[];
  readonly keywords: readonly string[];
}

interface NameRow {
  readonly key: string;
  readonly oracle_id: string;
}

interface PrintRow {
  readonly id: string;
  readonly oracle_id: string;
  readonly set: string;
  readonly set_name: string;
  readonly collector_number: string;
  readonly lang: string;
  readonly printed_name: string;
  readonly released_at: string;
  readonly image_status: string;
  readonly digital: boolean;
  readonly oversized: boolean;
  readonly layout: string;
  readonly set_type: string;
  readonly promo_types: readonly string[];
  readonly faces: readonly PrintFace[];
}

interface TokenLinkRow {
  readonly creator_print_id: string;
  readonly position: number;
  readonly token_print_id: string;
}

function pickImageUris(uris: ScryfallImageUris): ImageUris {
  return { small: uris.small, normal: uris.normal, large: uris.large, png: uris.png };
}

/**
 * One face per image: double-faced layouts have images on each face, others (split, flip,
 * adventure) have one image for the whole card.
 */
function facesOf(card: ScryfallCard): PrintFace[] {
  if (card.image_uris) {
    return [
      { name: card.name, artist: card.artist ?? '', imageUris: pickImageUris(card.image_uris) },
    ];
  }
  return (card.card_faces ?? []).flatMap((face) =>
    face.image_uris
      ? [{ name: face.name, artist: face.artist ?? '', imageUris: pickImageUris(face.image_uris) }]
      : [],
  );
}

/** A face's power and toughness, when it has them. */
function powerToughnessOf(face: ScryfallFace | ScryfallCard): PowerToughness | null {
  const { power, toughness } = face;
  return power !== undefined && toughness !== undefined ? { power, toughness } : null;
}

/**
 * Scryfall sets `printed_name` only where it differs from `name`, and on the faces of multi-face
 * prints. Italian names can change between reprints, so each print keeps its own.
 */
function printedNameOf(card: ScryfallCard): string {
  if (card.printed_name) return card.printed_name;
  const faces = card.card_faces ?? [];
  if (!faces.some((face) => face.printed_name)) return card.name;
  return faces.map((face) => face.printed_name ?? face.name).join(' // ');
}

/**
 * The tokens `card` creates, emblems and markers such as The Monarch included. A token creates
 * none: among its parts Scryfall lists, as tokens, itself and the tokens that create it, with
 * no way to tell those from the ones it creates.
 */
function tokenLinksOf(card: ScryfallCard): TokenLinkRow[] {
  if (isTokenLayout(card.layout)) return [];
  return (card.all_parts ?? [])
    .filter((part) => part.component === 'token')
    .map((part, position) => ({
      creator_print_id: card.id,
      position,
      token_print_id: part.id,
    }));
}

/**
 * A reversible card prints the same card on both faces, and Scryfall puts its oracle fields on
 * those faces only: the card is its first face.
 */
function isReversibleLayout(layout: string): boolean {
  return layout === 'reversible_card';
}

/** Scryfall writes power and toughness on each face of a multi-face card, else on the card. */
function cardRowOf(card: ScryfallCard, oracleId: string): CardRow {
  const firstFace = card.card_faces?.[0];
  if (isReversibleLayout(card.layout) && firstFace) {
    return {
      oracle_id: oracleId,
      name: firstFace.name,
      power_toughness_by_face: [powerToughnessOf(firstFace)],
      keywords: card.keywords ?? [],
    };
  }
  return {
    oracle_id: oracleId,
    name: card.name,
    power_toughness_by_face: (card.card_faces ?? [card]).map(powerToughnessOf),
    keywords: card.keywords ?? [],
  };
}

function toRows(
  card: ScryfallCard,
): { card: CardRow; print: PrintRow; tokenLinks: TokenLinkRow[] } | null {
  // Reversible cards carry the oracle id on their faces only.
  const oracleId = card.oracle_id ?? card.card_faces?.[0]?.oracle_id;
  if (!oracleId || !LANGS.has(card.lang)) return null;
  return {
    card: cardRowOf(card, oracleId),
    print: {
      id: card.id,
      oracle_id: oracleId,
      set: card.set,
      set_name: card.set_name,
      collector_number: card.collector_number,
      lang: card.lang,
      printed_name: printedNameOf(card),
      released_at: card.released_at,
      image_status: card.image_status,
      digital: card.digital,
      oversized: card.oversized,
      layout: card.layout,
      set_type: card.set_type,
      promo_types: card.promo_types ?? [],
      faces: facesOf(card),
    },
    tokenLinks: tokenLinksOf(card),
  };
}

/**
 * Reads `bulk` (a decompressed Scryfall bulk file, JSON Lines) one line at a time, so memory
 * stays flat whatever the file size. Rows go to staging tables; the live catalog is replaced in one transaction
 * only after the whole file is read, so a failed import leaves the previous catalog serving.
 */
export async function importBulk(sql: Sql, bulk: Readable): Promise<{ prints: number }> {
  // Session-level lock: it must be taken and released on the same connection.
  await using lockConnection = await sql.reserve();
  const [row] = await lockConnection<
    { locked: boolean }[]
  >`select pg_try_advisory_lock(${IMPORT_LOCK}) as locked`;
  if (!row?.locked) throw new Error('Another catalog import is running');
  try {
    return await importLocked(sql, bulk);
  } finally {
    await lockConnection`select pg_advisory_unlock(${IMPORT_LOCK})`;
  }
}

async function importLocked(sql: Sql, bulk: Readable): Promise<{ prints: number }> {
  // The daily schedule counts from the start, so a long import does not push the next one later.
  const startedAt = new Date();
  await sql`drop table if exists prints_staging, cards_staging, card_names_staging, token_links_staging`;
  await createCatalogTables(sql, '_staging');

  let imported = 0;
  let cards = new Map<string, CardRow>();
  // A reversible print knows its card less well than any other print of it (keywords may be
  // missing), so its card goes in only for the cards no other print gives, after the whole file.
  const cardsOfReversiblePrints = new Map<string, CardRow>();
  let names = new Map<string, NameRow>();
  let prints: PrintRow[] = [];
  let tokenLinks: TokenLinkRow[] = [];
  const flush = async () => {
    if (prints.length === 0) return;
    if (cards.size > 0) {
      await sql`
        insert into cards_staging ${sql([...cards.values()])}
        on conflict (oracle_id) do nothing
      `;
    }
    await sql`
      insert into card_names_staging ${sql([...names.values()])}
      on conflict (key, oracle_id) do nothing
    `;
    await sql`insert into prints_staging ${sql(prints)}`;
    if (tokenLinks.length > 0) await sql`insert into token_links_staging ${sql(tokenLinks)}`;
    imported += prints.length;
    cards = new Map();
    names = new Map();
    prints = [];
    tokenLinks = [];
  };

  // `crlfDelay: Infinity` treats "\r\n" as one line break even when split across chunks.
  for await (const line of createInterface({ input: bulk, crlfDelay: Infinity })) {
    if (line.trim() === '') continue;
    const rows = toRows(JSON.parse(line) as ScryfallCard);
    if (!rows) continue;
    const cardsOfBatch = isReversibleLayout(rows.print.layout) ? cardsOfReversiblePrints : cards;
    cardsOfBatch.set(rows.card.oracle_id, rows.card);
    prints.push(rows.print);
    tokenLinks.push(...rows.tokenLinks);
    for (const key of cardKeys(rows.card.name, [rows.print.printed_name])) {
      names.set(`${key}\n${rows.card.oracle_id}`, { key, oracle_id: rows.card.oracle_id });
    }
    if (prints.length >= BATCH_SIZE) await flush();
  }
  await flush();
  const reversibleCards = [...cardsOfReversiblePrints.values()];
  for (let start = 0; start < reversibleCards.length; start += BATCH_SIZE) {
    await sql`
      insert into cards_staging ${sql(reversibleCards.slice(start, start + BATCH_SIZE))}
      on conflict (oracle_id) do nothing
    `;
  }

  await sql.begin(async (tx) => {
    await tx`drop table if exists prints, cards, card_names, token_links`;
    await tx`alter table cards_staging rename to cards`;
    await tx`alter table prints_staging rename to prints`;
    await tx`alter table card_names_staging rename to card_names`;
    await tx`alter table token_links_staging rename to token_links`;
    // Indexes keep their names across a table rename: drop the suffix so the next import can
    // create its staging indexes again. Renaming a primary key's index renames the constraint.
    const indexes = await tx<{ indexname: string }[]>`
      select indexname from pg_indexes
      where schemaname = current_schema() and tablename in ('cards', 'prints', 'card_names', 'token_links')
    `;
    for (const { indexname } of indexes) {
      await tx`alter index ${tx(indexname)} rename to ${tx(indexname.replace('_staging_', '_'))}`;
    }
    await tx`insert into catalog_imports (started_at) values (${startedAt})`;
  });
  return { prints: imported };
}

/** When the import that produced the live catalog started, or `null` before the first one. */
export async function lastImportStartedAt(sql: Sql): Promise<Date | null> {
  const [row] = await sql<
    { startedAt: Date | null }[]
  >`select max(started_at) as "startedAt" from catalog_imports`;
  return row?.startedAt ?? null;
}
