import type { ImportCheckIn, ImportOutcome } from './import-check-in.ts';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
/** A failed import is retried sooner than a day, while yesterday's catalog keeps serving. */
const RETRY_AFTER = HOUR;

export interface DailyImportsHost {
  /** Ends the loop: a `wait` under way may reject once it is aborted. */
  readonly stop: AbortSignal;
  now(): Date;
  lastImportStartedAt(): Promise<Date | null>;
  importCatalog(): Promise<void>;
  checkIn: ImportCheckIn;
  wait(milliseconds: number): Promise<void>;
  readonly log: Pick<Console, 'log' | 'error'>;
}

/**
 * Keeps the catalog fresh: imports it once a day (ADR 0002). The first import starts right away
 * on an empty catalog; after a restart it waits for the rest of the day since the last one.
 */
export async function runDailyImports(host: DailyImportsHost): Promise<void> {
  const { stop, log } = host;
  /** A check-in that fails is only logged: the monitor alerts when it misses one. */
  const checkIn = async (outcome: ImportOutcome) => {
    try {
      await host.checkIn(outcome);
    } catch (error) {
      log.error(`The import's ${outcome} check-in failed`, error);
    }
  };
  while (!stop.aborted) {
    const last = await host.lastImportStartedAt();
    const wait = last ? last.getTime() + DAY - host.now().getTime() : 0;
    if (wait > 0) {
      log.log(`Next catalog import at ${new Date(host.now().getTime() + wait).toISOString()}`);
      await host.wait(wait);
      continue;
    }
    try {
      await host.importCatalog();
    } catch (error) {
      // A shutdown cuts the import short: that is no failure worth an alert.
      if (stop.aborted) return;
      log.error('Catalog import failed; the previous catalog keeps serving', error);
      await checkIn('failed');
      await host.wait(RETRY_AFTER);
      continue;
    }
    await checkIn('succeeded');
  }
}
