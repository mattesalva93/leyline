import postgres from 'postgres';

export type Sql = postgres.Sql;

export interface ConnectOptions {
  /** Schema to work in, before `public`. Tests use one per file. */
  readonly schema?: string;
}

export function connect(url: string, options: ConnectOptions = {}): Sql {
  return postgres(url, {
    onnotice: () => {},
    ...(options.schema ? { connection: { search_path: `${options.schema}, public` } } : {}),
  });
}

/**
 * Creates the catalog tables under `suffix` (empty for the live ones, `_staging` for an import).
 * Index names carry the suffix too, so a swap can rename them back (see `import-bulk.ts`).
 */
export async function createCatalogTables(sql: Sql, suffix: '' | '_staging'): Promise<void> {
  const cards = sql(`cards${suffix}`);
  const prints = sql(`prints${suffix}`);
  await sql`
    create table if not exists ${cards} (
      oracle_id text not null,
      name text not null,
      constraint ${sql(`cards${suffix}_pkey`)} primary key (oracle_id)
    )
  `;
  // Lookup keys follow `Catalog.findByNames`: lowercased full name and front-face name.
  await sql`
    create index if not exists ${sql(`cards${suffix}_name_idx`)} on ${cards} (lower(name))
  `;
  await sql`
    create index if not exists ${sql(`cards${suffix}_front_face_idx`)}
    on ${cards} (lower(split_part(name, ' // ', 1)))
  `;
  await sql`
    create table if not exists ${prints} (
      id text not null,
      oracle_id text not null,
      set text not null,
      collector_number text not null,
      lang text not null,
      printed_name text not null,
      released_at date not null,
      image_status text not null,
      digital boolean not null,
      oversized boolean not null,
      layout text not null,
      set_type text not null,
      promo_types text[] not null,
      faces jsonb not null,
      constraint ${sql(`prints${suffix}_pkey`)} primary key (id)
    )
  `;
  await sql`
    create index if not exists ${sql(`prints${suffix}_oracle_id_idx`)} on ${prints} (oracle_id)
  `;
}

/** Brings the database to the current schema. Safe to run on every start. */
export async function migrate(sql: Sql): Promise<void> {
  // Fuzzy name search (ADR 0003). Also created by docker/postgres/init for local databases.
  await sql`create extension if not exists pg_trgm`;
  await createCatalogTables(sql, '');
  await sql`create table if not exists catalog_imports (started_at timestamptz not null)`;
}
