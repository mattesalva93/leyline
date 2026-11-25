import { close, flush, getClient } from '@sentry/browser';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { ERROR_REPORTS_PATH } from './error-reports-path.ts';
import { reportErrors } from './report-errors.ts';

/** A DSN shaped like Bugsink's: the SDK ignores one whose key is not a word. */
const DSN = 'https://0123456789abcdef0123456789abcdef@bugsink.example/42';

/** What the browser does with an error no code caught, which the SDK listens to. */
function throwUncaught(error: Error) {
  window.onerror?.(error.message, 'https://leyline.website/assets/index.js', 1, 1, error);
}

/** An envelope's lines: its header, then each item's header and payload. */
const EVENT_PAYLOAD_LINE = 2;

/** The envelopes the SDK sent, each as its address and its lines of JSON. */
function sentEnvelopes(fetchMock: { mock: { calls: unknown[][] } }) {
  return (fetchMock.mock.calls as [string, RequestInit][]).map(([url, init]) => ({
    url,
    items: String(init.body)
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as Record<string, unknown>),
  }));
}

afterAll(async () => {
  await close();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// The SDK starts once per page: its handler of uncaught errors stays with the first client.
describe('reporting the browser’s errors', () => {
  it('starts nothing and sends nothing while the DSN is empty', async () => {
    const fetchMock = vi.fn(async () => new Response('{}'));
    vi.stubGlobal('fetch', fetchMock);

    vi.stubEnv('VITE_BUGSINK_DSN', '');
    await reportErrors();
    throwUncaught(new Error('boom'));

    expect(getClient()).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  describe('with a DSN', () => {
    // Vitest clears a mock's calls before each test: the envelopes are read once they are sent.
    let envelopes: ReturnType<typeof sentEnvelopes> = [];

    beforeAll(async () => {
      const fetchMock = vi.fn(async () => new Response('{}'));
      vi.stubGlobal('fetch', fetchMock);
      vi.stubEnv('VITE_BUGSINK_DSN', DSN);
      await reportErrors();
      console.log('4 Lightning Bolt');
      throwUncaught(new Error('boom'));
      await flush(2000);
      envelopes = sentEnvelopes(fetchMock);
    });

    it('sends an uncaught error to the site’s own path, with the bundle’s release', () => {
      expect(envelopes.map(({ url }) => url)).toEqual([ERROR_REPORTS_PATH]);
      expect(envelopes[0]?.items[EVENT_PAYLOAD_LINE]).toMatchObject({
        release: import.meta.env.APP_VERSION,
        exception: { values: [{ value: 'boom' }] },
      });
    });

    it('sends the error alone: no session, user, breadcrumbs or console message', () => {
      const items = envelopes.flatMap((envelope) => envelope.items);

      expect(items.map((item) => item.type).filter(Boolean)).toEqual(['event']);
      expect(items[EVENT_PAYLOAD_LINE]).not.toHaveProperty('user');
      expect(items[EVENT_PAYLOAD_LINE]).not.toHaveProperty('breadcrumbs');
      expect(JSON.stringify(items)).not.toContain('Lightning Bolt');
    });
  });
});
