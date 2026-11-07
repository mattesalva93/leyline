/** `DATABASE_URL`, required. `pnpm` scripts load it from the repo's `.env` when present. */
export function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set: copy .env.example to .env');
  return url;
}
