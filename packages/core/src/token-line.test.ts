import { describe, expect, it } from 'vitest';
import { tokenLineNamingItsPrint, type Print, type ResolvedLine } from './index.ts';
import { aCard, aPrint } from './test-fixtures.ts';

const tokenPrint = (set: string, collectorNumber: string): Print =>
  aPrint({ id: `soldier-${set}`, set, collectorNumber, layout: 'token' });
const TFRC = tokenPrint('tfrc', '3');
const TWAR = tokenPrint('twar', '5');
const TM20 = tokenPrint('tm20', '2');

function soldierLine(text: string, overrides: Partial<ResolvedLine> = {}): ResolvedLine {
  return {
    text,
    quantity: 2,
    lang: 'en',
    status: 'resolved',
    card: aCard({ oracleId: 'soldier', name: 'Soldier' }),
    defaultPrint: TFRC,
    printWarning: null,
    allocations: [],
    ...overrides,
  };
}

describe('tokenLineNamingItsPrint', () => {
  it('names the print the line resolved to on a line written by the name alone', () => {
    const rewritten = tokenLineNamingItsPrint(soldierLine('2 Soldier'));

    expect(rewritten?.resolution).toMatchObject({
      text: '2 Soldier (TFRC) 3',
      defaultPrint: { id: 'soldier-tfrc' },
      allocations: [],
    });
    expect(rewritten?.allocations).toEqual({ oracleId: 'soldier', allocations: [] });
  });

  it('names the print every copy moved to, the copies staying on it', () => {
    const line = soldierLine('2 Soldier (TFRC) 3', { allocations: [{ print: TWAR, quantity: 2 }] });

    const rewritten = tokenLineNamingItsPrint(line);

    expect(rewritten?.resolution).toMatchObject({
      text: '2 Soldier (TWAR) 5',
      quantity: 2,
      defaultPrint: { id: 'soldier-twar' },
      allocations: [],
    });
    expect(rewritten?.allocations.allocations).toEqual([{ print: TWAR, quantity: 2 }]);
  });

  it('names the print with the most copies, the copies left on the old one allocated to it', () => {
    const line = soldierLine('3 Soldier (TFRC) 3', {
      quantity: 3,
      allocations: [{ print: TWAR, quantity: 2 }],
    });

    const rewritten = tokenLineNamingItsPrint(line);

    expect(rewritten?.resolution.text).toBe('3 Soldier (TWAR) 5');
    expect(rewritten?.allocations.allocations).toEqual([
      { print: TWAR, quantity: 2 },
      { print: TFRC, quantity: 1 },
    ]);
  });

  it("on a tie, names the print of the line's first tile", () => {
    const line = soldierLine('2 Soldier (TFRC) 3', {
      allocations: [
        { print: TM20, quantity: 1 },
        { print: TWAR, quantity: 1 },
      ],
    });

    expect(tokenLineNamingItsPrint(line)?.resolution.text).toBe('2 Soldier (TM20) 2');
  });

  it('leaves a line that names its print already as it is', () => {
    const line = soldierLine('2 Soldier (TFRC) 3', { allocations: [{ print: TWAR, quantity: 1 }] });

    expect(tokenLineNamingItsPrint(line)).toBeNull();
  });

  it('keeps the quantity as written and the sideboard prefix', () => {
    const line = soldierLine('SB: 2x Soldier', {});

    expect(tokenLineNamingItsPrint(line)?.resolution.text).toBe('SB: 2x Soldier (TFRC) 3');
  });

  it('leaves the line of a card that is no token as it is', () => {
    const line = soldierLine('2 Sol Ring', {
      card: aCard({ oracleId: 'sol-ring', name: 'Sol Ring' }),
      defaultPrint: aPrint({ id: 'sol-ring-c21' }),
      allocations: [{ print: aPrint({ id: 'sol-ring-lea', set: 'lea' }), quantity: 2 }],
    });

    expect(tokenLineNamingItsPrint(line)).toBeNull();
  });
});
