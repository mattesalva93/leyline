import { describe, expect, it } from 'vitest';
import {
  addTokensToSection,
  createInMemoryCatalog,
  resolveDecklist,
  writtenLinesOf,
  type SuggestedToken,
} from './index.ts';
import { aCard, aPrint } from './test-fixtures.ts';

const today = '2026-11-13';
const soldierPrint = aPrint({
  id: 'soldier-twar',
  set: 'twar',
  collectorNumber: '3',
  printedName: 'Soldier',
});
const otherSoldierPrint = aPrint({
  id: 'other-soldier-tdom',
  set: 'tdom',
  collectorNumber: '2',
  printedName: 'Soldier',
});
const soldier = { card: aCard({ oracleId: 'soldier', name: 'Soldier' }), prints: [soldierPrint] };
const otherSoldier = {
  card: aCard({ oracleId: 'other-soldier', name: 'Soldier' }),
  prints: [otherSoldierPrint],
};
const forest = { card: aCard({ oracleId: 'forest', name: 'Forest' }), prints: [aPrint()] };
const catalog = createInMemoryCatalog([soldier, otherSoldier, forest]);

const SOLDIER: SuggestedToken = {
  candidate: { card: soldier.card, defaultPrint: soldierPrint, printWarning: null },
  lang: 'en',
  createdBy: [0],
};
const OTHER_SOLDIER: SuggestedToken = {
  candidate: { card: otherSoldier.card, defaultPrint: otherSoldierPrint, printWarning: null },
  lang: 'en',
  createdBy: [0],
};

describe('addTokensToSection', () => {
  it('writes a token as one copy named by set and number, under a Tokens header it opens at the end', () => {
    const addition = addTokensToSection('4 Forest\n\nSideboard\n2 Forest', [SOLDIER]);

    expect(addition.text).toBe('4 Forest\n\nSideboard\n2 Forest\n\nTokens\n1 Soldier (TWAR) 3');
    expect(addition.lines).toEqual([
      {
        writtenIndex: 6,
        line: {
          text: '1 Soldier (TWAR) 3',
          quantity: 1,
          lang: 'en',
          status: 'resolved',
          ...SOLDIER.candidate,
          allocations: [],
        },
      },
    ]);
  });

  it("writes every token given after the Tokens section's last card, in their order", () => {
    const addition = addTokensToSection('4 Forest\n\nTokens\n1 Treasure\n\nSideboard\n2 Forest', [
      SOLDIER,
      OTHER_SOLDIER,
    ]);

    expect(addition.text).toBe(
      '4 Forest\n\nTokens\n1 Treasure\n1 Soldier (TWAR) 3\n1 Soldier (TDOM) 2\n\nSideboard\n2 Forest',
    );
    expect(addition.lines.map(({ writtenIndex }) => writtenIndex)).toEqual([4, 5]);
    expect(addition.previousWrittenIndexes).toEqual([0, 1, 2, 3, null, null, 4, 5, 6]);
  });

  it('opens a decklist with nothing written yet with the Tokens header', () => {
    expect(addTokensToSection('', [SOLDIER]).text).toBe('Tokens\n1 Soldier (TWAR) 3');
  });

  it('writes lines the server resolves to the very print each token was added at', async () => {
    const addition = addTokensToSection('', [SOLDIER, OTHER_SOLDIER]);

    const resolved = await resolveDecklist(addition.text, catalog, { today, lang: 'en' });

    expect(resolved).toEqual(addition.lines.map(({ line }) => line));
    expect(
      addition.lines.map(({ writtenIndex }) => writtenLinesOf(addition.text)[writtenIndex]),
    ).toEqual(['1 Soldier (TWAR) 3', '1 Soldier (TDOM) 2']);
  });
});
