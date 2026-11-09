// Keeps the catalog fresh: imports Scryfall's `all_cards` bulk once a day (ADR 0002).
// Runs as the `importer` service in compose.yaml. The first import starts right away on an
// empty catalog; after a restart it waits for the rest of the day since the last one.
import { setTimeout as sleep } from 'node:timers/promises';
import { connect, migrate } from './db.ts';
import { databaseUrl } from './env.ts';
import { importBulk, lastImportStartedAt } from './import-bulk.ts';
import { allCardsBulkUrl, downloadBulk } from './scryfall.ts';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
/** A failed import is retried sooner than a day, while yesterday's catalog keeps serving. */
const RETRY_AFTER = HOUR;

const stop = new AbortController();
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => stop.abort());
}

const sql = connect(databaseUrl());
try {
  await migrate(sql);
  while (!stop.signal.aborted) {
    const last = await lastImportStartedAt(sql);
    const wait = last ? last.getTime() + DAY - Date.now() : 0;
    if (wait > 0) {
      console.log(`Next catalog import at ${new Date(Date.now() + wait).toISOString()}`);
      await sleep(wait, undefined, { signal: stop.signal });
      continue;
    }
    try {
      const url = await allCardsBulkUrl();
      console.log(`Downloading and importing ${url}`);
      const { prints } = await importBulk(sql, await downloadBulk(url));
      console.log(`Imported ${prints} prints`);
    } catch (error) {
      console.error('Catalog import failed; the previous catalog keeps serving', error);
      await sleep(RETRY_AFTER, undefined, { signal: stop.signal });
    }
  }
} catch (error) {
  // `sleep` rejects with an AbortError on shutdown; anything else is a real failure.
  if (!stop.signal.aborted) throw error;
} finally {
  await sql.end();
}
