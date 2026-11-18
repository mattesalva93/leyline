// Builders for test data. Defaults describe a plain, printable English paper print.
import type { Card, Print } from './index.ts';

export function aCard(overrides: Partial<Card> = {}): Card {
  return {
    oracleId: 'oracle-id',
    name: 'Card Name',
    powerToughnessByFace: [null],
    keywords: [],
    ...overrides,
  };
}

export function aPrint(overrides: Partial<Print> = {}): Print {
  return {
    id: 'print-id',
    set: 'tst',
    setName: 'Test Set',
    collectorNumber: '1',
    lang: 'en',
    printedName: 'Card Name',
    releasedAt: '2020-01-01',
    imageStatus: 'highres_scan',
    digital: false,
    oversized: false,
    layout: 'normal',
    setType: 'expansion',
    promoTypes: [],
    faces: [
      {
        name: 'Card Name',
        artist: 'Test Artist',
        imageUris: {
          small: 'https://cards.scryfall.io/small/front/x.jpg',
          normal: 'https://cards.scryfall.io/normal/front/x.jpg',
          large: 'https://cards.scryfall.io/large/front/x.jpg',
          png: 'https://cards.scryfall.io/png/front/x.png',
        },
      },
    ],
    ...overrides,
  };
}

/** The marker of a JPEG comment segment, where `jpegOfSize` writes its label. */
export const JPEG_COMMENT = [0xff, 0xfe];

/**
 * A header-only baseline JPEG: enough for a PDF writer to read its size, not a real picture.
 * `label` goes in a comment segment, so the test can tell embedded images apart.
 */
export function jpegOfSize(width: number, height: number, label = ''): Uint8Array {
  const text = [...label].map((char) => char.charCodeAt(0));
  const length = text.length + 2;
  return new Uint8Array([
    0xff, 0xd8, // SOI
    ...JPEG_COMMENT, length >> 8, length & 0xff, ...text, // COM
    0xff, 0xc0, 0x00, 0x11, 0x08, // SOF0, length 17, 8 bits per sample
    height >> 8, height & 0xff, width >> 8, width & 0xff,
    0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, // 3 components
    0xff, 0xd9, // EOI
  ]); // prettier-ignore
}
