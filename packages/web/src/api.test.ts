import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchImages } from './api.ts';

/** What the image CDN does for each request to a URL, in order: a status, or a network error. */
type Answer = number | 'networkError';

const IMAGE_BYTES = new Uint8Array([0xff, 0xd8]);

/** Stands in for `fetch`, answering each URL with its `answers` in turn, and logs when it asked. */
function stubImageCdn(answers: Record<string, Answer[]>) {
  const requests: { readonly url: string; readonly atMs: number }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      requests.push({ url, atMs: Date.now() });
      const answer = answers[url]?.shift() ?? 200;
      if (answer === 'networkError') throw new TypeError('Failed to fetch');
      return new Response(answer === 200 ? IMAGE_BYTES : null, { status: answer });
    }),
  );
  return requests;
}

/** Runs `fetchImages` with the clock moved on until every wait between tries is over. */
async function fetchImagesToTheEnd(...args: Parameters<typeof fetchImages>) {
  const fetched = fetchImages(...args);
  await vi.runAllTimersAsync();
  return fetched;
}

describe('fetchImages', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: 0 });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('fetches an image that a network error interrupts twice, on the third try', async () => {
    stubImageCdn({ a: ['networkError', 'networkError', 200] });

    const { images, failedUrls } = await fetchImagesToTheEnd(['a']);

    expect(images.get('a')).toEqual(IMAGE_BYTES);
    expect(failedUrls).toEqual([]);
  });

  it('retries a 5xx or a 429 up to three tries in all, waiting longer before each', async () => {
    const requests = stubImageCdn({ busy: [503, 503, 503, 200], limited: [429, 429, 429, 200] });

    const { images, failedUrls } = await fetchImagesToTheEnd(['busy', 'limited']);

    expect(failedUrls).toEqual(['busy', 'limited']);
    expect(images.size).toBe(0);
    const triedAt = (url: string) => requests.filter((r) => r.url === url).map((r) => r.atMs);
    expect(triedAt('busy')).toEqual([0, 1000, 3000]);
    expect(triedAt('limited')).toEqual([0, 1000, 3000]);
  });

  it('never retries an image Scryfall answers 404', async () => {
    const requests = stubImageCdn({ gone: [404, 200] });

    const { failedUrls } = await fetchImagesToTheEnd(['gone']);

    expect(failedUrls).toEqual(['gone']);
    expect(requests).toHaveLength(1);
  });

  it('fetches every other image to the end when one fails', async () => {
    stubImageCdn({ gone: [404] });
    const onImageFetched = vi.fn();

    const { images, failedUrls } = await fetchImagesToTheEnd(['a', 'gone', 'b'], onImageFetched);

    expect([...images.keys()].sort()).toEqual(['a', 'b']);
    expect(failedUrls).toEqual(['gone']);
    expect(onImageFetched.mock.calls).toEqual([[1], [2]]);
  });
});
