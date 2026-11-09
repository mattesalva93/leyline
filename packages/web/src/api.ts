import type { DecklistLine, Lang } from '@mtg-suite/core';

export async function resolveDecklistText(text: string, lang: Lang): Promise<DecklistLine[]> {
  const response = await fetch('/api/decklists/resolve', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ text, lang }),
  });
  if (!response.ok) throw new Error(`Resolve failed with ${response.status}`);
  return ((await response.json()) as { lines: DecklistLine[] }).lines;
}

/**
 * Fetches card images straight from cards.scryfall.io, which allows any origin (ADR 0001).
 * Browsers set their own User-Agent; the image CDN has no rate limit.
 */
export async function fetchImages(urls: readonly string[]): Promise<Map<string, Uint8Array>> {
  const entries = await Promise.all(
    urls.map(async (url) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Image ${url} failed with ${response.status}`);
      return [url, new Uint8Array(await response.arrayBuffer())] as const;
    }),
  );
  return new Map(entries);
}
