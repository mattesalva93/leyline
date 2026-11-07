// Streams a Scryfall bulk file into the catalog and swaps it in atomically (ADR 0002).
import type { ImageUris, PrintFace } from '@mtg-suite/core';
import type { Readable } from 'node:stream';
import { createInterface } from 'node:readline';
import { createCatalogTables, type Sql } from './db.ts';

/** Only English for now; ADR 0002 widens this to `en` and `it`. */
const LANGS = new Set(['en']);
const BATCH_SIZE = 1000;

interface ScryfallImageUris {
  readonly small: string;
  readonly normal: string;
  readonly large: string;
}

interface ScryfallFace {
  readonly name: string;
  readonly oracle_id?: string;
  readonly image_uris?: ScryfallImageUris;
}

/** The fields of a Scryfall card object the import reads. */
interface ScryfallCard {
  readonly id: string;
  readonly oracle_id?: string;
  readonly name: string;
  readonly lang: string;
  readonly released_at: string;
  readonly set: string;
  readonly set_type: string;
  readonly collector_number: string;
  readonly digital: boolean;
  readonly oversized: boolean;
  readonly layout: string;
  readonly image_status: string;
  readonly image_uris?: ScryfallImageUris;
  readonly card_faces?: readonly ScryfallFace[];
}

interface CardRow {
  readonly oracle_id: string;
  readonly name: string;
}

interface PrintRow {
  readonly id: string;
  readonly oracle_id: string;
  readonly set: string;
  readonly collector_number: string;
  readonly lang: string;
  readonly released_at: string;
  readonly image_status: string;
  readonly digital: boolean;
  readonly oversized: boolean;
  readonly layout: string;
  readonly set_type: string;
  readonly faces: readonly PrintFace[];
}

function pickImageUris(uris: ScryfallImageUris): ImageUris {
  return { small: uris.small, normal: uris.normal, large: uris.large };
}

/**
 * One face per image: double-faced layouts have images on each face, others (split, flip,
 * adventure) have one image for the whole card.
 */
function facesOf(card: ScryfallCard): PrintFace[] {
  if (card.image_uris) return [{ name: card.name, imageUris: pickImageUris(card.image_uris) }];
  return (card.card_faces ?? []).flatMap((face) =>
    face.image_uris ? [{ name: face.name, imageUris: pickImageUris(face.image_uris) }] : [],
  );
}

function toRows(card: ScryfallCard): { card: CardRow; print: PrintRow } | null {
  // Reversible cards carry the oracle id on their faces only.
  const oracleId = card.oracle_id ?? card.card_faces?.[0]?.oracle_id;
  if (!oracleId || !LANGS.has(card.lang)) return null;
  return {
    card: { oracle_id: oracleId, name: card.name },
    print: {
      id: card.id,
      oracle_id: oracleId,
      set: card.set,
      collector_number: card.collector_number,
      lang: card.lang,
      released_at: card.released_at,
      image_status: card.image_status,
      digital: card.digital,
      oversized: card.oversized,
      layout: card.layout,
      set_type: card.set_type,
      faces: facesOf(card),
    },
  };
}

/**
 * Reads `bulk` (a decompressed Scryfall bulk file, JSON Lines) one line at a time, so memory
 * stays flat whatever the file size. Rows go to staging tables; the live catalog is replaced in one transaction
 * only after the whole file is read, so a failed import leaves the previous catalog serving.
 */
export async function importBulk(sql: Sql, bulk: Readable): Promise<{ prints: number }> {
  await sql`drop table if exists prints_staging, cards_staging`;
  await createCatalogTables(sql, '_staging');

  let imported = 0;
  let cards = new Map<string, CardRow>();
  let prints: PrintRow[] = [];
  const flush = async () => {
    if (prints.length === 0) return;
    await sql`
      insert into cards_staging ${sql([...cards.values()])}
      on conflict (oracle_id) do nothing
    `;
    await sql`insert into prints_staging ${sql(prints)}`;
    imported += prints.length;
    cards = new Map();
    prints = [];
  };

  // `crlfDelay: Infinity` treats "\r\n" as one line break even when split across chunks.
  for await (const line of createInterface({ input: bulk, crlfDelay: Infinity })) {
    if (line.trim() === '') continue;
    const rows = toRows(JSON.parse(line) as ScryfallCard);
    if (!rows) continue;
    cards.set(rows.card.oracle_id, rows.card);
    prints.push(rows.print);
    if (prints.length >= BATCH_SIZE) await flush();
  }
  await flush();

  await sql.begin(async (tx) => {
    await tx`drop table if exists prints, cards`;
    await tx`alter table cards_staging rename to cards`;
    await tx`alter table prints_staging rename to prints`;
    // Indexes keep their names across a table rename: drop the suffix so the next import can
    // create its staging indexes again. Renaming a primary key's index renames the constraint.
    const indexes = await tx<{ indexname: string }[]>`
      select indexname from pg_indexes
      where schemaname = current_schema() and tablename in ('cards', 'prints')
    `;
    for (const { indexname } of indexes) {
      await tx`alter index ${tx(indexname)} rename to ${tx(indexname.replace('_staging_', '_'))}`;
    }
  });
  return { prints: imported };
}
