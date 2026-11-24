// The database URLs, required. `pnpm` scripts load them from the repo's `.env` when present.

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set: copy .env.example to .env`);
  return value;
}

/** `READER_DATABASE_URL`: `leyline_reader`, who can only read the catalog (ADR 0016). */
export function readerDatabaseUrl(): string {
  return requiredEnv('READER_DATABASE_URL');
}

/** `OWNER_DATABASE_URL`: `leyline_owner`, who owns the schema, migrates it and imports (ADR 0016). */
export function ownerDatabaseUrl(): string {
  return requiredEnv('OWNER_DATABASE_URL');
}
