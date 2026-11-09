import type { Catalog, CatalogEntry, Print } from '@mtg-suite/core';
import type { Sql } from './db.ts';

interface PrintRow extends Omit<Print, 'faces'> {
  readonly oracleId: string;
  readonly faces: Print['faces'];
}

function toPrint(row: PrintRow): Print {
  return {
    id: row.id,
    set: row.set,
    collectorNumber: row.collectorNumber,
    lang: row.lang,
    printedName: row.printedName,
    releasedAt: row.releasedAt,
    imageStatus: row.imageStatus,
    digital: row.digital,
    oversized: row.oversized,
    layout: row.layout,
    setType: row.setType,
    promoTypes: row.promoTypes,
    faces: row.faces,
  };
}

/** `Catalog` on the PostgreSQL tables filled by `importBulk`. */
export function createPostgresCatalog(sql: Sql): Catalog {
  return {
    async findByNames(names, { minSimilarity }) {
      if (names.length === 0) return [];
      const oracleIds = await sql.begin(async (tx) => {
        const exact = await tx<{ key: string; oracleId: string }[]>`
          select key, oracle_id as "oracleId" from card_names where key = any(${[...names]}::text[])
        `;
        // Only names without an exact match need the (slower) similarity search.
        const found = new Set(exact.map((row) => row.key));
        const misspelled = names.filter((name) => !found.has(name));
        if (misspelled.length === 0) return exact.map((row) => row.oracleId);
        // `%` matches at `pg_trgm.similarity_threshold`; `true` scopes it to this transaction.
        await tx`select set_config('pg_trgm.similarity_threshold', ${String(minSimilarity)}, true)`;
        const similar = await tx<{ oracleId: string }[]>`
          select distinct n.oracle_id as "oracleId"
          from unnest(${misspelled}::text[]) as q(key)
          join card_names n on n.key % q.key
        `;
        return [...exact, ...similar].map((row) => row.oracleId);
      });
      return entriesOf(sql, [...new Set(oracleIds)]);
    },

    async findCard(oracleId) {
      const [entry] = await entriesOf(sql, [oracleId]);
      return entry ?? null;
    },
  };
}

/** The cards with the given oracle ids, each with all its prints, newest first. */
async function entriesOf(sql: Sql, oracleIds: readonly string[]): Promise<CatalogEntry[]> {
  if (oracleIds.length === 0) return [];
  const cards = await sql<{ oracleId: string; name: string }[]>`
    select oracle_id as "oracleId", name from cards
    where oracle_id = any(${[...oracleIds]}::text[])
  `;
  const prints = await sql<PrintRow[]>`
    select
      id, oracle_id as "oracleId", set, collector_number as "collectorNumber", lang,
      printed_name as "printedName",
      released_at::text as "releasedAt", image_status as "imageStatus", digital, oversized,
      layout, set_type as "setType",
      promo_types as "promoTypes", faces
    from prints
    where oracle_id = any(${cards.map((card) => card.oracleId)}::text[])
    order by released_at desc, id
  `;
  const printsByCard = new Map<string, PrintRow[]>();
  for (const print of prints) {
    const group = printsByCard.get(print.oracleId);
    if (group) group.push(print);
    else printsByCard.set(print.oracleId, [print]);
  }
  return cards.map((card): CatalogEntry => ({
    card: { oracleId: card.oracleId, name: card.name },
    prints: (printsByCard.get(card.oracleId) ?? []).map(toPrint),
  }));
}
