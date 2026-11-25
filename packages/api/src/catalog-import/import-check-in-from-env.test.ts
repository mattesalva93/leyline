import { afterEach, describe, expect, it, vi } from 'vitest';
import { importCheckInFromEnv } from './import-check-in-from-env.ts';

/** A ping URL shaped like Healthchecks.io's: its host and the check's UUID. */
const PING_URL = 'https://hc-ping.com/5f1c2d6e-8a4b-4c3d-9e2f-1a2b3c4d5e6f';

function stubFetch(
  answer: (init: RequestInit) => Promise<Response> = async () => new Response('OK'),
) {
  const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>((_, init) =>
    answer(init),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** Healthchecks.io out of reach: the request hangs until it is abandoned. */
function neverAnswering(init: RequestInit): Promise<Response> {
  return new Promise((_, reject) => {
    init.signal?.addEventListener('abort', () => reject(init.signal?.reason));
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the import’s check-in to Healthchecks.io', () => {
  it.each(['succeeded', 'failed'] as const)(
    'sends nothing after an import that %s while the ping URL is empty',
    async (outcome) => {
      const fetchMock = stubFetch();

      await importCheckInFromEnv({ HEALTHCHECKS_PING_URL: '' })(outcome);
      await importCheckInFromEnv({})(outcome);

      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['succeeded', PING_URL],
    ['failed', `${PING_URL}/fail`],
  ] as const)(
    'pings the check’s URL after an import that %s, sending nothing of the catalog or the host',
    async (outcome, pingedUrl) => {
      const fetchMock = stubFetch();

      await importCheckInFromEnv({ HEALTHCHECKS_PING_URL: PING_URL })(outcome);

      const [[url, init]] = fetchMock.mock.calls as [[string, RequestInit]];
      expect(url).toBe(pingedUrl);
      expect(init.method).toBe('GET');
      expect(init.body).toBeUndefined();
      expect(init.headers).toBeUndefined();
    },
  );

  it('fails when Healthchecks.io does not take the ping', async () => {
    stubFetch(async () => new Response('not found', { status: 404 }));

    await expect(
      importCheckInFromEnv({ HEALTHCHECKS_PING_URL: PING_URL })('succeeded'),
    ).rejects.toThrow('404');
  });

  it('gives up on a ping that has no answer within ten seconds', async () => {
    vi.useFakeTimers();
    try {
      stubFetch(neverAnswering);

      const checkIn = importCheckInFromEnv({ HEALTHCHECKS_PING_URL: PING_URL })('succeeded');
      const settled = expect(checkIn).rejects.toThrow();
      await vi.advanceTimersByTimeAsync(10_000);

      await settled;
    } finally {
      vi.useRealTimers();
    }
  });

  it('abandons a ping under way once the importer stops', async () => {
    stubFetch(neverAnswering);
    const stop = new AbortController();

    const checkIn = importCheckInFromEnv(
      { HEALTHCHECKS_PING_URL: PING_URL },
      stop.signal,
    )('succeeded');
    stop.abort();

    await expect(checkIn).rejects.toThrow();
  });
});
