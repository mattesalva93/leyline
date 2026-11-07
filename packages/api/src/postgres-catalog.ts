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
    releasedAt: row.releasedAt,
    imageStatus: row.imageStatus,
    digital: row.digital,
    oversized: row.oversized,
    layout: row.layout,
    setType: row.setType,
    faces: row.faces,
  };
}

/** `Catalog` on the PostgreSQL tables filled by `importBulk`. */
export function createPostgresCatalog(sql: Sql): Catalog {
  return {
    async findByNames(names: readonly string[]) {
      if (names.length === 0) return [];
      const keys = [...names];
      const cards = await sql<{ oracleId: string; name: string }[]>`
        select oracle_id as "oracleId", name from cards
        where lower(name) = any(${keys}::text[])
           or lower(split_part(name, ' // ', 1)) = any(${keys}::text[])
      `;
      if (cards.length === 0) return [];
      const prints = await sql<PrintRow[]>`
        select
          id, oracle_id as "oracleId", set, collector_number as "collectorNumber", lang,
          released_at::text as "releasedAt", image_status as "imageStatus", digital, oversized,
          layout, set_type as "setType", faces
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
    },
  };
}
