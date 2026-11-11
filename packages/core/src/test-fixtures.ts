// Builders for test data. Defaults describe a plain, printable English paper print.
import type { Card, Print } from './index.ts';

export function aCard(overrides: Partial<Card> = {}): Card {
  return { oracleId: 'oracle-id', name: 'Card Name', ...overrides };
}

export function aPrint(overrides: Partial<Print> = {}): Print {
  return {
    id: 'print-id',
    set: 'tst',
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
