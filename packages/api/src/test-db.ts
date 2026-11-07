// A throwaway PostgreSQL schema per test file, on the database from `pnpm db:up` (or CI's).
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { connect, type Sql } from './db.ts';

const DEFAULT_URL = 'postgres://mtg:mtg@localhost:5432/mtg_suite';

export interface TestDb {
  readonly sql: Sql;
  drop(): Promise<void>;
}

export async function createTestDb(): Promise<TestDb> {
  const url = process.env.DATABASE_URL ?? DEFAULT_URL;
  const schema = `test_${randomUUID().replaceAll('-', '')}`;
  const admin = postgres(url, { onnotice: () => {} });
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
