// Scryfall bulk objects for tests, trimmed to the fields the import reads.
import { Readable } from 'node:stream';

const imageUris = (id: string) => ({
  small: `https://cards.scryfall.io/small/front/${id}.jpg`,
  normal: `https://cards.scryfall.io/normal/front/${id}.jpg`,
  large: `https://cards.scryfall.io/large/front/${id}.jpg`,
  png: `https://cards.scryfall.io/png/front/${id}.png`,
});

export function scryfallCard(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const id = String(overrides.id ?? '00000000-0000-0000-0000-000000000001');
  return {
    object: 'card',
    id,
    oracle_id: 'aaaaaaaa-0000-0000-0000-000000000001',
    name: 'Sol Ring',
    lang: 'en',
    released_at: '2021-04-23',
    set: 'c21',
    set_type: 'commander',
    collector_number: '263',
    digital: false,
    oversized: false,
    layout: 'normal',
    image_status: 'highres_scan',
    image_uris: imageUris(id),
    ...overrides,
  };
}

export function doubleFacedCard(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const id = String(overrides.id ?? '00000000-0000-0000-0000-0000000000df');
  return {
    ...scryfallCard({ id, image_uris: undefined }),
    oracle_id: 'aaaaaaaa-0000-0000-0000-0000000000df',
    name: 'Delver of Secrets // Insectile Aberration',
    layout: 'transform',
    card_faces: [
      { name: 'Delver of Secrets', image_uris: imageUris(`${id}-front`) },
      { name: 'Insectile Aberration', image_uris: imageUris(`${id}-back`) },
    ],
    ...overrides,
  };
}

/**
 * A decompressed bulk file (JSON Lines: one card object per line, as Scryfall serves it since
 * 2026) as a byte stream, cut into small chunks so lines span chunk boundaries.
 */
export function bulkStream(cards: readonly unknown[]): Readable {
  return textStream(cards.map((card) => `${JSON.stringify(card)}\n`).join(''));
}

export function textStream(text: string, chunkSize = 64): Readable {
  const chunks: Buffer[] = [];
  for (let start = 0; start < text.length; start += chunkSize) {
    chunks.push(Buffer.from(text.slice(start, start + chunkSize)));
  }
  return Readable.from(chunks);
}
