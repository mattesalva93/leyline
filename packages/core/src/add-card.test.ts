import { describe, expect, it } from 'vitest';
import {
  addCardToSection,
  createInMemoryCatalog,
  resolveDecklist,
  sectionOfEachWrittenLine,
  writtenLinesOf,
  type Candidate,
  type DecklistSection,
} from './index.ts';
import { aCard, aPrint } from './test-fixtures.ts';

const forest = { card: aCard({ oracleId: 'forest', name: 'Forest' }), prints: [aPrint()] };
const solRing = {
  card: aCard({ oracleId: 'sol-ring', name: 'Sol Ring' }),
  prints: [aPrint({ id: 'sol-ring-c21' })],
};
const catalog = createInMemoryCatalog([forest, solRing]);

const SOL_RING: Candidate = {
  card: solRing.card,
  defaultPrint: aPrint({ id: 'sol-ring-c21' }),
  printWarning: null,
};

/** What the server resolves each written line of `text` to, with where it is written. */
async function resolvedLinesOf(text: string) {
  const lines = await resolveDecklist(text, catalog, { today: '2026-11-13', lang: 'en' });
  return writtenLinesOf(text).flatMap((writtenLine, writtenIndex) => {
    const line = lines.find((resolved) => resolved.text === writtenLine);
    return line ? [{ writtenIndex, line }] : [];
  });
}

async function add(text: string, section: DecklistSection) {
  return addCardToSection(
    text,
    { section, candidate: SOL_RING, lang: 'en' },
    await resolvedLinesOf(text),
  );
}

describe('addCardToSection', () => {
  it("writes one copy of the card after the section's last card, by its English name", async () => {
    const addition = await add('4 Forest\n\nSideboard\n2 Forest', 'mainDeck');

    expect(addition.text).toBe('4 Forest\n1 Sol Ring\n\nSideboard\n2 Forest');
    expect(addition).toMatchObject({
      added: 'line',
      writtenIndex: 1,
      previousWrittenIndexes: [0, null, 1, 2, 3],
      line: {
        text: '1 Sol Ring',
        status: 'resolved',
        quantity: 1,
        lang: 'en',
        card: { oracleId: 'sol-ring' },
        defaultPrint: { id: 'sol-ring-c21' },
        allocations: [],
      },
    });
  });

  it('adds a copy to the line of the section that already has the card', async () => {
    const addition = await add('Deck\n1 Sol Ring\n4 Forest\n\nSideboard\n2 Forest', 'mainDeck');

    expect(addition.text).toBe('Deck\n2 Sol Ring\n4 Forest\n\nSideboard\n2 Forest');
    expect(addition).toMatchObject({ added: 'copy', writtenIndex: 1, quantity: 2 });
  });

  it('writes a new line when only another section has the card', async () => {
    const addition = await add('1 Sol Ring\n\nSideboard\n2 Forest', 'sideboard');

    expect(addition.text).toBe('1 Sol Ring\n\nSideboard\n2 Forest\n1 Sol Ring');
    expect(addition.added).toBe('line');
  });

  it('opens the section with its header when the decklist has none', async () => {
    const addition = await add('4 Forest', 'sideboard');

    expect(addition.text).toBe('4 Forest\n\nSideboard\n1 Sol Ring');
    expect(addition.writtenIndex).toBe(3);
  });

  it('gives the line the sideboard prefix when the sideboard is written with one', async () => {
    const addition = await add('4 Forest\nSB: 2 Forest', 'sideboard');

    expect(addition.text).toBe('4 Forest\nSB: 2 Forest\nSB: 1 Sol Ring');
    expect(sectionOfEachWrittenLine(writtenLinesOf(addition.text))[2]).toBe('sideboard');
  });

  it('makes the line the whole decklist when the text is blank', async () => {
    const addition = await add('', 'mainDeck');

    expect(addition.text).toBe('1 Sol Ring');
    expect(addition).toMatchObject({ writtenIndex: 0, previousWrittenIndexes: [null] });
  });
});
