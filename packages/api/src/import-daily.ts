// Runs the daily catalog import as the `importer` service in compose.yaml.
import { setTimeout as sleep } from 'node:timers/promises';
import { connect, migrate } from './catalog/db.ts';
import { ownerDatabaseUrl } from './env.ts';
import { importBulk, lastImportStartedAt } from './catalog-import/import-bulk.ts';
import { allCardsBulkUrl, downloadBulk } from './catalog-import/scryfall.ts';
import { runDailyImports } from './catalog-import/daily-imports.ts';
import { importCheckInFromEnv } from './catalog-import/import-check-in-from-env.ts';

const stop = new AbortController();
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => stop.abort());
}

const sql = connect(ownerDatabaseUrl());
try {
  await migrate(sql);
  await runDailyImports({
    stop: stop.signal,
    now: () => new Date(),
    lastImportStartedAt: () => lastImportStartedAt(sql),
    async importCatalog() {
      const url = await allCardsBulkUrl();
      console.log(`Downloading and importing ${url}`);
      const { prints } = await importBulk(sql, await downloadBulk(url));
      console.log(`Imported ${prints} prints`);
    },
    checkIn: importCheckInFromEnv(process.env, stop.signal),
    wait: (milliseconds) => sleep(milliseconds, undefined, { signal: stop.signal }),
    log: console,
  });
} catch (error) {
  // `sleep` rejects with an AbortError on shutdown; anything else is a real failure.
  if (!stop.signal.aborted) throw error;
} finally {
  await sql.end();
}
