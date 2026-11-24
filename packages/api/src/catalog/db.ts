import postgres from 'postgres';

export type Sql = postgres.Sql;

interface ConnectOptions {
  /** Schema to work in, before `public`. Tests use one per file. */
  readonly schema?: string;
}

/** Most connections one process opens: postgres.js's own default, a request beyond waits. */
export const DATABASE_POOL_SIZE = 10;

export function connect(url: string, options: ConnectOptions = {}): Sql {
  return postgres(url, {
    max: DATABASE_POOL_SIZE,
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
  const names = sql(`card_names${suffix}`);
  const tokenLinks = sql(`token_links${suffix}`);
  await sql`
    create table if not exists ${cards} (
      oracle_id text not null,
      name text not null,
      power_toughness_by_face jsonb not null,
      keywords text[] not null,
      constraint ${sql(`cards${suffix}_pkey`)} primary key (oracle_id)
    )
  `;
  // Every name key a card answers to (`cardKeys` in core).
  await sql`
    create table if not exists ${names} (
      key text not null,
      oracle_id text not null,
      constraint ${sql(`card_names${suffix}_pkey`)} primary key (key, oracle_id)
    )
  `;
  // Fuzzy name search (ADR 0003): the `%` similarity operator uses this index.
  await sql`
    create index if not exists ${sql(`card_names${suffix}_key_trgm_idx`)}
    on ${names} using gin (key gin_trgm_ops)
  `;
  await sql`
    create table if not exists ${prints} (
      id text not null,
      oracle_id text not null,
      set text not null,
      set_name text not null,
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
      flavor_name text,
      constraint ${sql(`prints${suffix}_pkey`)} primary key (id)
    )
  `;
  await sql`
    create index if not exists ${sql(`prints${suffix}_oracle_id_idx`)} on ${prints} (oracle_id)
  `;
  // The tokens a print creates: its Scryfall `all_parts` with `component: "token"`, in order.
  await sql`
    create table if not exists ${tokenLinks} (
      creator_print_id text not null,
      position integer not null,
      token_print_id text not null,
      constraint ${sql(`token_links${suffix}_pkey`)} primary key (creator_print_id, position)
    )
  `;
}

/** Every table `migrate` creates. */
const CATALOG_TABLES = ['cards', 'card_names', 'prints', 'token_links', 'catalog_imports'];

/**
 * Whether `migrate` has created the catalog tables in the schema `sql` works in. Only there: a
 * test's schema must not find the live tables in `public`, later on its search path.
 */
export async function hasCatalogTables(sql: Sql): Promise<boolean> {
  const [row] = await sql<{ found: number }[]>`
    select count(*)::int as found from information_schema.tables
    where table_schema = current_schema() and table_name = any(${CATALOG_TABLES}::text[])
  `;
  return row?.found === CATALOG_TABLES.length;
}

/**
 * Brings the database to the current schema. Safe to run on every start. Needs the schema's
 * owner: the importer runs it, the API only reads (ADR 0016).
 */
export async function migrate(sql: Sql): Promise<void> {
  // Fuzzy name search (ADR 0003). Also created by docker/postgres/init for local databases.
  await sql`create extension if not exists pg_trgm`;
  await createCatalogTables(sql, '');
  // Catalogs imported before set names were: the next import fills them in.
  await sql`alter table prints add column if not exists set_name text not null default ''`;
  // Catalogs imported before alternate names were: the next import fills them in.
  await sql`alter table prints add column if not exists flavor_name text`;
  await sql`create table if not exists catalog_imports (started_at timestamptz not null)`;
}
