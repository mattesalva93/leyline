import {
  isBlankPrintQuery,
  type Candidate,
  type DecklistLine,
  type FoundCard,
  type Lang,
  type TokenQueryLine,
  type PrintCountsByLang,
  type PrintPage,
  type SuggestedToken,
} from '@mtg-suite/core';

export async function resolveDecklistText(text: string, lang: Lang): Promise<DecklistLine[]> {
  const response = await fetch('/api/decklists/resolve', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ text, lang }),
  });
  if (!response.ok) throw new Error(`Resolve failed with ${response.status}`);
  return ((await response.json()) as { lines: DecklistLine[] }).lines;
}

/** The tokens the cards of `lines` create, none of them already among `lines`. */
export async function fetchSuggestedTokens(
  lines: readonly TokenQueryLine[],
  lang: Lang,
): Promise<SuggestedToken[]> {
  const response = await fetch('/api/decklists/suggested-tokens', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ lines, lang }),
  });
  if (!response.ok) throw new Error(`Suggested tokens failed with ${response.status}`);
  return ((await response.json()) as { tokens: SuggestedToken[] }).tokens;
}

/**
 * Fetches card images straight from cards.scryfall.io, which allows any origin (ADR 0001).
 * Browsers set their own User-Agent; the image CDN has no rate limit. `onImageFetched` is
 * called with how many images have arrived so far.
 */
export async function fetchImages(
  urls: readonly string[],
  onImageFetched: (fetchedCount: number) => void = () => {},
): Promise<Map<string, Uint8Array>> {
  let fetchedCount = 0;
  // One failed image fails them all: the others are cancelled, so none reports progress after.
  const cancelOnFailure = new AbortController();
  const { signal } = cancelOnFailure;
  const entries = await Promise.all(
    urls.map(async (url) => {
      try {
        const response = await fetch(url, { signal });
        if (!response.ok) throw new Error(`Image ${url} failed with ${response.status}`);
        const bytes = new Uint8Array(await response.arrayBuffer());
        signal.throwIfAborted();
        onImageFetched(++fetchedCount);
        return [url, bytes] as const;
      } catch (error) {
        cancelOnFailure.abort();
        throw error;
      }
    }),
  );
  return new Map(entries);
}

/**
 * One page of the prints `oracleId` can print with in `lang`, `limit` at most (the server caps
 * it); with a `printQuery` that is not blank, only the prints it finds.
 */
export async function fetchPrintPage(
  oracleId: string,
  lang: Lang,
  limit: number,
  cursor: string | null,
  printQuery = '',
): Promise<PrintPage> {
  const query = new URLSearchParams({ lang, limit: String(limit) });
  if (cursor) query.set('cursor', cursor);
  if (!isBlankPrintQuery(printQuery)) query.set('q', printQuery);
  const response = await fetch(`/api/cards/${encodeURIComponent(oracleId)}/prints?${query}`, {
    headers: { accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Prints failed with ${response.status}`);
  return (await response.json()) as PrintPage;
}

/** How many prints `oracleId` can print with in each language, with no page of them. */
export async function fetchPrintCounts(oracleId: string): Promise<PrintCountsByLang> {
  const response = await fetch(`/api/cards/${encodeURIComponent(oracleId)}/print-counts`, {
    headers: { accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Print counts failed with ${response.status}`);
  return (await response.json()) as PrintCountsByLang;
}

/** The cards whose name, English or in a language the catalog holds, comes close to `query`. */
export async function searchCardsByName(query: string, lang: Lang): Promise<FoundCard[]> {
  const response = await fetch(`/api/cards/search?${new URLSearchParams({ q: query, lang })}`, {
    headers: { accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Search failed with ${response.status}`);
  return ((await response.json()) as { cards: FoundCard[] }).cards;
}

/** Every card a line naming `name` could mean, each with its default print in `lang`. */
export async function fetchCardsNamed(name: string, lang: Lang): Promise<Candidate[]> {
  const response = await fetch(`/api/cards/named?${new URLSearchParams({ name, lang })}`, {
    headers: { accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Cards named failed with ${response.status}`);
  return ((await response.json()) as { cards: Candidate[] }).cards;
}
