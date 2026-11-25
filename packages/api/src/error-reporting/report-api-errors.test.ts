import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { errorReporterFromEnv } from './report-api-errors.ts';

/** A DSN shaped like Bugsink's. */
const DSN = 'https://0123456789abcdef0123456789abcdef@bugsink.example/42';
const ERROR_REPORTS_URL = 'http://web:8082/error-reports';

/** The release Bugsink must see: the one version, in the root package.json (ADR 0025). */
const ROOT_VERSION = (
  JSON.parse(readFileSync(new URL('../../../../package.json', import.meta.url), 'utf8')) as {
    version: string;
  }
).version;

/** An envelope's lines: its header, then each item's header and payload. */
const EVENT_PAYLOAD_LINE = 2;

function stubFetch() {
  const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(
    async () => new Response('{}'),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the api’s error reporter', () => {
  it.each([
    ['no DSN', { ERROR_REPORTS_URL }],
    ['no internal listener', { BUGSINK_DSN: DSN }],
  ])('sends nothing with %s', async (_, env) => {
    const fetchMock = stubFetch();

    (await errorReporterFromEnv(env)).report(new Error('boom'));
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends a reported error to Caddy’s internal listener, with the root package’s release', async () => {
    const fetchMock = stubFetch();

    const reporter = await errorReporterFromEnv({ BUGSINK_DSN: DSN, ERROR_REPORTS_URL });
    reporter.report(new Error('boom'));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const [[url, init]] = fetchMock.mock.calls as [[string, RequestInit], ...unknown[]];
    const items = String(init.body)
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as Record<string, unknown>);
    expect(url).toBe(ERROR_REPORTS_URL);
    expect(items.map((item) => item.type).filter(Boolean)).toEqual(['event']);
    expect(items[EVENT_PAYLOAD_LINE]).toMatchObject({
      release: ROOT_VERSION,
      exception: { values: [{ type: 'Error', value: 'boom' }] },
    });
    expect(items[EVENT_PAYLOAD_LINE]).not.toHaveProperty('request');
    expect(items[EVENT_PAYLOAD_LINE]).not.toHaveProperty('user');
  });
});
