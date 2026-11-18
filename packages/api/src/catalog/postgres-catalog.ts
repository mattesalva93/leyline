import type { Card, Catalog, CatalogEntry, Print, PrintFace } from '@mtg-suite/core';
import type { Sql } from './db.ts';

/** A face as the catalog stores it: imports before artists were kept have none. */
type StoredFace = Omit<PrintFace, 'artist'> & { readonly artist?: string };

interface PrintRow extends Omit<Print, 'faces'> {
  readonly oracleId: string;
  readonly faces: readonly StoredFace[];
}

function toPrint(row: PrintRow): Print {
  return {
    id: row.id,
    set: row.set,
    setName: row.setName,
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
    faces: row.faces.map((face) => ({ ...face, artist: face.artist ?? '' })),
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

    async searchByName(key, { minSimilarity, limit }) {
      const startsWithKey = `${key.replace(/[\\%_]/g, '\\$&')}%`;
      const found = await sql.begin(async (tx) => {
        // `%` matches at `pg_trgm.similarity_threshold`; `true` scopes it to this transaction.
        await tx`select set_config('pg_trgm.similarity_threshold', ${String(minSimilarity)}, true)`;
        return tx<{ oracleId: string }[]>`
          select n.oracle_id as "oracleId"
          from card_names n
          join cards c on c.oracle_id = n.oracle_id
          where n.key like ${startsWithKey} or n.key % ${key}
          group by n.oracle_id, c.name
          order by
            min(case when n.key = ${key} then 0 when n.key like ${startsWithKey} then 1 else 2 end),
            max(similarity(n.key, ${key})) desc,
            c.name
          limit ${limit}
        `;
      });
      const entries = await entriesOf(
        sql,
        found.map((row) => row.oracleId),
      );
      const byId = new Map(entries.map((entry) => [entry.card.oracleId, entry]));
      return found.flatMap((row) => byId.get(row.oracleId) ?? []);
    },

    async findCard(oracleId) {
      const [entry] = await entriesOf(sql, [oracleId]);
      return entry ?? null;
    },

    async findTokensCreatedBy(printIds) {
      if (printIds.length === 0) return [];
      // A print with no parts of its own (Scryfall lists them on English prints only) takes
      // those of the English print with its set and number.
      const links = await sql<{ creatorPrintId: string; tokenPrintId: string; oracleId: string }[]>`
        with asked as (
          select p.id, coalesce(en.id, p.id) as parts_print_id
          from prints p
          left join prints en
            on en.oracle_id = p.oracle_id and en.set = p.set
            and en.collector_number = p.collector_number and en.lang = 'en'
          where p.id = any(${[...printIds]}::text[])
        )
        select
          a.id as "creatorPrintId", l.token_print_id as "tokenPrintId", t.oracle_id as "oracleId"
        from asked a
        join token_links l on l.creator_print_id = a.parts_print_id
        join prints t on t.id = l.token_print_id
        order by a.id, l.position
      `;
      const entries = await entriesOf(sql, [...new Set(links.map((link) => link.oracleId))]);
      const byId = new Map(entries.map((entry) => [entry.card.oracleId, entry]));
      return links.flatMap(({ creatorPrintId, tokenPrintId, oracleId }) => {
        const token = byId.get(oracleId);
        return token ? [{ creatorPrintId, tokenPrintId, token }] : [];
      });
    },
  };
}

/** The cards with the given oracle ids, each with all its prints, newest first. */
async function entriesOf(sql: Sql, oracleIds: readonly string[]): Promise<CatalogEntry[]> {
  if (oracleIds.length === 0) return [];
  const cards = await sql<Card[]>`
    select
      oracle_id as "oracleId", name,
      power_toughness_by_face as "powerToughnessByFace", keywords
    from cards
    where oracle_id = any(${[...oracleIds]}::text[])
  `;
  const prints = await sql<PrintRow[]>`
    select
      id, oracle_id as "oracleId", set, set_name as "setName", collector_number as "collectorNumber", lang,
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
    card,
    prints: (printsByCard.get(card.oracleId) ?? []).map(toPrint),
  }));
}
