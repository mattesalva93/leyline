// A throwaway PostgreSQL schema per test file, on the database from `pnpm db:up` (or CI's).
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { connect, type Sql } from '../catalog/db.ts';

const DEFAULT_URL = 'postgres://mtg:mtg@localhost:5432/mtg_suite';

export interface TestDb {
  readonly sql: Sql;
  drop(): Promise<void>;
}

function databaseUrl(): string {
  return process.env.DATABASE_URL ?? DEFAULT_URL;
}

/** A connection to a database the server does not have: every query fails, as on an outage. */
export function connectToMissingDatabase(): Sql {
  const url = new URL(databaseUrl());
  url.pathname = `/missing_${randomUUID().replaceAll('-', '')}`;
  return connect(url.href);
}

export async function createTestDb(): Promise<TestDb> {
  const url = databaseUrl();
  const schema = `test_${randomUUID().replaceAll('-', '')}`;
  const admin = postgres(url, { onnotice: () => {} });
  // In `public`, as docker/postgres/init does: created by a test's `migrate`, it would land in
  // that test's schema, out of sight of the others.
  await admin`create extension if not exists pg_trgm`;
  await admin`create schema ${admin(schema)}`;
  const sql = connect(url, { schema });
  return {
    sql,
    async drop() {
      await sql.end();
      await admin`drop schema ${admin(schema)} cascade`;
      await admin.end();
    },
  };
}
