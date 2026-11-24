// Downloads from Scryfall. Every request to api.scryfall.com needs an accurate User-Agent and an
// Accept header (https://scryfall.com/docs/api); we send both to data.scryfall.io too.
import { Readable } from 'node:stream';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
import { createGunzip } from 'node:zlib';

const HEADERS = {
  'User-Agent': 'Leyline/0.0.0 (+https://github.com/mattesalva93/leyline)',
  Accept: 'application/json',
};

interface BulkDataItem {
  readonly type: string;
  readonly jsonl_download_uri?: string;
}

async function get(url: string, accept = HEADERS.Accept): Promise<Response> {
  const response = await fetch(url, { headers: { ...HEADERS, Accept: accept } });
  if (!response.ok) throw new Error(`GET ${url} answered ${response.status}`);
  return response;
}

/** The URL of today's `all_cards` bulk file (ADR 0002). URLs change daily. */
export async function allCardsBulkUrl(): Promise<string> {
  const index = (await (await get('https://api.scryfall.com/bulk-data')).json()) as {
    data: BulkDataItem[];
  };
  const url = index.data.find((item) => item.type === 'all_cards')?.jsonl_download_uri;
  if (!url) throw new Error('Scryfall bulk-data has no all_cards JSON Lines file');
  return url;
}

/**
 * Streams a bulk file, decompressed. Scryfall serves it as a `.jsonl.gz` file
 * (`Content-Type: application/gzip`, no `Content-Encoding`), so `fetch` does not inflate it.
 */
export async function downloadBulk(url: string): Promise<Readable> {
  const response = await get(url, 'application/gzip');
  if (!response.body) throw new Error(`GET ${url} has no body`);
  return Readable.fromWeb(response.body as NodeReadableStream<Uint8Array>).compose(createGunzip());
}

/** Downloads card images from cards.scryfall.io, keyed by URL, as the browser does for the PDF. */
export async function downloadImages(urls: readonly string[]): Promise<Map<string, Uint8Array>> {
  const entries = await Promise.all(
    urls.map(async (url) => {
      const response = await get(url, 'image/*');
      return [url, new Uint8Array(await response.arrayBuffer())] as const;
    }),
  );
  return new Map(entries);
}
