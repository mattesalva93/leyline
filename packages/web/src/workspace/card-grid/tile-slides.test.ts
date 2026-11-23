import { describe, expect, it } from 'vitest';
import { slideKeysOf, slidesBetween } from './tile-slides.ts';

/** Print ids shaped as Scryfall's, which are UUIDs. */
const SOL_RING_C21 = '0afa0e33-4804-4b00-b625-c2d6b61090fc';
const LIGHTNING_BOLT_M10 = '4e4fb50c-a81f-44d3-93c5-fa9a0b37f617';

/** A tile of `writtenIndex`'s line showing the print `printId`, as the grid keys it. */
function printTile(writtenIndex: number, printId: string) {
  return {
    kind: 'print',
    key: `${writtenIndex}:${printId}`,
    tile: { print: { id: printId } },
  } as const;
}

describe('where each tile slides from as the grid reorders', () => {
  it('slides a moved tile from where it stood to where it now stands', () => {
    // Sol Ring went from the first column to the second, Lightning Bolt the other way, 160 px apart.
    const before = [
      { slideKey: 'sol-ring', left: 0, top: 0 },
      { slideKey: 'lightning-bolt', left: 160, top: 0 },
    ];
    const after = [
      { slideKey: 'lightning-bolt', left: 0, top: 0 },
      { slideKey: 'sol-ring', left: 160, top: 0 },
    ];
    expect(slidesBetween(before, after)).toEqual([
      { slideKey: 'lightning-bolt', fromX: 160, fromY: 0 },
      { slideKey: 'sol-ring', fromX: -160, fromY: 0 },
    ]);
  });

  it('never slides a tile whose place changed only because the grid changed width', () => {
    // A narrower grid wraps Lightning Bolt onto a second row: the order stays the same.
    const before = [
      { slideKey: 'sol-ring', left: 0, top: 0 },
      { slideKey: 'lightning-bolt', left: 160, top: 0 },
    ];
    const after = [
      { slideKey: 'sol-ring', left: 0, top: 0 },
      { slideKey: 'lightning-bolt', left: 0, top: 230 },
    ];
    expect(slidesBetween(before, after)).toEqual([]);
  });

  it('slides only the tiles that moved, not one that just arrived nor one that kept its place', () => {
    // Counterspell was added after Sol Ring, pushing Lightning Bolt one column on.
    const before = [
      { slideKey: 'sol-ring', left: 0, top: 0 },
      { slideKey: 'lightning-bolt', left: 160, top: 0 },
    ];
    const after = [
      { slideKey: 'sol-ring', left: 0, top: 0 },
      { slideKey: 'counterspell', left: 160, top: 0 },
      { slideKey: 'lightning-bolt', left: 320, top: 0 },
    ];
    expect(slidesBetween(before, after)).toEqual([
      { slideKey: 'lightning-bolt', fromX: -160, fromY: 0 },
    ]);
  });
});

describe('what names a tile as it slides', () => {
  it('names a tile by the card it shows, the same after its line moves in the decklist', () => {
    const before = slideKeysOf([
      {
        name: 'mainDeck',
        gridTiles: [printTile(0, SOL_RING_C21), printTile(1, LIGHTNING_BOLT_M10)],
      },
    ]);
    const after = slideKeysOf([
      {
        name: 'mainDeck',
        gridTiles: [printTile(0, LIGHTNING_BOLT_M10), printTile(1, SOL_RING_C21)],
      },
    ]);
    expect(after.get(printTile(1, SOL_RING_C21).key)).toBe(
      before.get(printTile(0, SOL_RING_C21).key),
    );
    expect(after.get(printTile(0, LIGHTNING_BOLT_M10).key)).toBe(
      before.get(printTile(1, LIGHTNING_BOLT_M10).key),
    );
  });

  it('names apart two tiles showing the same print, in the same section or not', () => {
    const slideKeys = slideKeysOf([
      { name: 'mainDeck', gridTiles: [printTile(0, SOL_RING_C21), printTile(1, SOL_RING_C21)] },
      { name: 'sideboard', gridTiles: [printTile(2, SOL_RING_C21)] },
    ]);
    expect(new Set(slideKeys.values()).size).toBe(slideKeys.size);
  });

  it('names a tile with no print by its line as written, and an add tile by its section', () => {
    const imageless = { kind: 'imageless', key: '0', writtenLine: '1 Sol Rnig' } as const;
    const before = slideKeysOf([{ name: 'mainDeck', gridTiles: [imageless] }]);
    const after = slideKeysOf([
      {
        name: 'mainDeck',
        gridTiles: [printTile(0, LIGHTNING_BOLT_M10), { ...imageless, key: '1' }],
      },
    ]);
    expect(after.get('1')).toBe(before.get('0'));
    expect(after.get('add:mainDeck')).toBe(before.get('add:mainDeck'));
  });
});
