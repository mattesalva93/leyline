import { describe, expect, it } from 'vitest';
import { nameSharedByEvery, searchRowsOf, type FoundCard } from './index.ts';
import { aCard, aPrint } from './test-fixtures.ts';

function found(oracleId: string, name: string, sameNamedCardCount = 1): FoundCard {
  return {
    card: aCard({ oracleId, name }),
    defaultPrint: aPrint({ id: `${oracleId}-print` }),
    printWarning: null,
    sameNamedCardCount,
  };
}

describe('the rows of a card search', () => {
  it('gives a card with a name of its own a row that adds it', () => {
    const solRing = found('sol-ring', 'Sol Ring');
    expect(searchRowsOf([solRing])).toEqual([{ kind: 'card', candidate: solRing }]);
  });

  it('gives a name several cards share one row, which tells how many they are', () => {
    const whiteSoldier = found('white-soldier', 'Soldier', 15);
    const redSoldier = found('red-soldier', 'Soldier', 15);
    expect(searchRowsOf([whiteSoldier, redSoldier])).toEqual([
      { kind: 'sharedName', name: 'Soldier', cardCount: 15, first: whiteSoldier },
    ]);
  });

  it('counts a double-faced card under the name of its front face', () => {
    const soldier = found('soldier', 'Soldier', 3);
    const soldierGoblin = found('soldier-goblin', 'Soldier // Goblin', 3);
    expect(searchRowsOf([soldierGoblin, soldier])).toEqual([
      { kind: 'sharedName', name: 'Soldier', cardCount: 3, first: soldierGoblin },
    ]);
  });

  it('keeps the rows in the order the search found their first card', () => {
    const goblin = found('goblin', 'Goblin', 6);
    const soldier = found('soldier', 'Soldier', 15);
    const goblinGuide = found('goblin-guide', 'Goblin Guide');
    const rows = searchRowsOf([goblin, soldier, found('goblin-2', 'Goblin', 6), goblinGuide]);
    expect(rows.map((row) => (row.kind === 'card' ? row.candidate.card.name : row.name))).toEqual([
      'Goblin',
      'Soldier',
      'Goblin Guide',
    ]);
  });

  it('gives a name the search found once a shared-name row when other cards share it', () => {
    const soldier = found('soldier', 'Soldier', 15);
    expect(searchRowsOf([soldier])).toEqual([
      { kind: 'sharedName', name: 'Soldier', cardCount: 15, first: soldier },
    ]);
  });
});

describe('the name every candidate shares', () => {
  it('is the name of tokens that share it', () => {
    expect(nameSharedByEvery([found('white', 'Soldier'), found('red', 'Soldier')])).toBe('Soldier');
  });

  it('is the front face name, when a double-faced card shares it', () => {
    expect(nameSharedByEvery([found('goblin', 'Soldier // Goblin'), found('red', 'Soldier')])).toBe(
      'Soldier',
    );
  });

  it('is none for candidates named differently', () => {
    expect(
      nameSharedByEvery([found('bolt', 'Lightning Bolt'), found('helix', 'Lightning Helix')]),
    ).toBeNull();
  });
});
