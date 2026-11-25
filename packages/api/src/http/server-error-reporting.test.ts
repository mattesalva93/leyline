import { inspect } from 'node:util';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from './app.ts';
import { systemClock } from './clock.ts';
import { recordedErrorReporter } from '../test-support/recorded-error-reporter.ts';
import { recordedSecurityLog } from '../test-support/recorded-security-log.ts';
import { connectToMissingDatabase } from '../test-support/test-db.ts';

const missingDb = connectToMissingDatabase();

afterAll(async () => {
  await missingDb.end();
});

/** The app on `sql`, with an error reporter the test holds. */
function appReportingTo(sql: Parameters<typeof createApp>[0]['sql']) {
  const errorReporter = recordedErrorReporter();
  const app = createApp({
    sql,
    clock: systemClock,
    securityLog: recordedSecurityLog(),
    errorReporter,
    trustedProxyHost: null,
  });
  return { app, errorReporter };
}

describe('reporting the api’s errors', () => {
  it('reports an error that becomes a 500, with the error itself', async () => {
    const { app, errorReporter } = appReportingTo(missingDb);

    const response = await app.request('/api/cards/search?q=counterspell');

    expect(response.status).toBe(500);
    expect(errorReporter.reported).toEqual([
      expect.objectContaining({ message: expect.stringContaining('does not exist') }),
    ]);
  });

  it('reports none of the request’s headers or body', async () => {
    const { app, errorReporter } = appReportingTo(missingDb);

    await app.request('/api/decklists/resolve', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'session=tester' },
      body: JSON.stringify({ text: '4 Lightning Bolt' }),
    });

    expect(errorReporter.reported).toHaveLength(1);
    const reported = inspect(errorReporter.reported, { depth: null, showHidden: true });
    expect(reported).not.toContain('Lightning Bolt');
    expect(reported).not.toContain('session=tester');
  });

  it('reports no client error', async () => {
    // A query that is not one fails before the catalog is read.
    const { app, errorReporter } = appReportingTo(missingDb);

    const response = await app.request('/api/cards/search');

    expect(response.status).toBe(400);
    expect(errorReporter.reported).toEqual([]);
  });
});
