import { describe, expect, it } from 'vitest';
import { runDailyImports } from './daily-imports.ts';
import type { ImportOutcome } from './import-check-in.ts';

interface FakeHost {
  /** Throws instead of importing while true. */
  scryfallDown?: boolean;
  /** Rejects every check-in while true. */
  healthchecksDown?: boolean;
  /** Stops the loop once this many imports have been tried. */
  stopAfterImports?: number;
  /** Shuts the importer down while an import runs, which cuts it short. */
  shutdownDuringImport?: boolean;
}

/**
 * The importer's world in memory: a catalog that remembers when its last import started, a
 * clock that a wait moves forward, and the check-ins the loop sent.
 */
function fakeHost({
  scryfallDown = false,
  healthchecksDown = false,
  stopAfterImports = 1,
  shutdownDuringImport = false,
}: FakeHost) {
  let now = new Date('2026-11-25T03:00:00Z').getTime();
  let lastImportStartedAt: Date | null = null;
  const stop = new AbortController();
  const importsTried: Date[] = [];
  const checkIns: ImportOutcome[] = [];
  const errorsLogged: unknown[][] = [];
  const stopOnceEnoughImports = () => {
    if (importsTried.length >= stopAfterImports) stop.abort();
  };
  return {
    importsTried,
    checkIns,
    errorsLogged,
    run: () =>
      runDailyImports({
        stop: stop.signal,
        now: () => new Date(now),
        lastImportStartedAt: async () => lastImportStartedAt,
        async importCatalog() {
          importsTried.push(new Date(now));
          if (shutdownDuringImport) {
            stop.abort();
            throw new Error('Connection terminated');
          }
          if (scryfallDown) throw new Error('Scryfall answered 503');
          lastImportStartedAt = new Date(now);
        },
        async checkIn(outcome) {
          checkIns.push(outcome);
          if (healthchecksDown) throw new Error('Healthchecks.io timed out');
        },
        async wait(milliseconds) {
          stopOnceEnoughImports();
          now += milliseconds;
        },
        log: { log: () => {}, error: (...args: unknown[]) => errorsLogged.push(args) },
      }),
  };
}

describe('the daily catalog import', () => {
  it('checks in a success after an import that succeeds', async () => {
    const host = fakeHost({});

    await host.run();

    expect(host.checkIns).toEqual(['succeeded']);
  });

  it('checks in a failure after an import that fails', async () => {
    const host = fakeHost({ scryfallDown: true });

    await host.run();

    expect(host.checkIns).toEqual(['failed']);
  });

  it('checks in nothing for an import that a shutdown cuts short', async () => {
    const host = fakeHost({ shutdownDuringImport: true });

    await host.run();

    expect(host.checkIns).toEqual([]);
  });

  it.each([
    ['succeeds', false, '2026-11-26T03:00:00.000Z'],
    ['fails', true, '2026-11-25T04:00:00.000Z'],
  ])(
    'goes on importing when the check-in after an import that %s fails, and logs it',
    async (_, scryfallDown, nextImportStartsAt) => {
      const host = fakeHost({ scryfallDown, healthchecksDown: true, stopAfterImports: 2 });

      await host.run();

      expect(host.importsTried.map((startedAt) => startedAt.toISOString())).toEqual([
        '2026-11-25T03:00:00.000Z',
        nextImportStartsAt,
      ]);
      expect(host.errorsLogged.flat()).toContainEqual(new Error('Healthchecks.io timed out'));
    },
  );
});
