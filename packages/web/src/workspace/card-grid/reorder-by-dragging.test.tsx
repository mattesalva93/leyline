import { createEvent, fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../../api.ts';
import { DESKTOP, stubScreen } from '../../test-support/test-screen.ts';
import {
  mountPageAndWrite,
  pickCandidate,
  moveOneCopy,
  decklistValue,
  aDataTransfer,
  startDrag,
  answerApiCallsFromCatalog,
} from '../../test-support/workspace-page.ts';
import { cardGrid, gridTiles, gridSections, tileSummary } from '../../test-support/grid-queries.ts';

vi.mock('../../api.ts');

beforeEach(answerApiCallsFromCatalog);

/** The grid tile showing `button`, the list item a mouse drags. */
function tileOf(button: HTMLElement | undefined): HTMLElement {
  const tile = button?.closest('li');
  if (!tile) throw new Error('the button is in no tile');
  return tile;
}

/** Holds the dragged tile over the `side` half of `over`. */
function holdOver(over: HTMLElement, side: 'before' | 'after') {
  // jsdom lays nothing out: the tile under the pointer gets a box, so the pointer is on one half.
  over.getBoundingClientRect = () => ({ left: 0, width: 100, top: 0, height: 140 }) as DOMRect;
  // jsdom has no DragEvent, so the event it makes keeps no pointer position of its own.
  const event = createEvent.dragOver(over, { dataTransfer: aDataTransfer() });
  Object.defineProperty(event, 'clientX', { value: side === 'before' ? 25 : 75 });
  fireEvent(over, event);
}

/** Starts dragging `tile` with the mouse and holds it over the `side` half of `over`. */
function dragOver(tile: HTMLElement, over: HTMLElement, side: 'before' | 'after') {
  startDrag(tile);
  holdOver(over, side);
}

/** Drags `tile` with the mouse and drops it on the `side` half of `onto`. */
function dragAndDrop(tile: HTMLElement, onto: HTMLElement, side: 'before' | 'after') {
  dragOver(tile, onto, side);
  fireEvent.drop(onto);
  fireEvent.dragEnd(tile);
}

/** The bar that shows where a dragged line will land, if one shows. */
function dropMark() {
  return within(cardGrid()).queryByRole('separator', { name: 'Punto di arrivo' });
}

describe('reordering the decklist by dragging tiles', () => {
  it("moves the dragged tile's line where it is dropped, in the text and in the grid", async () => {
    await mountPageAndWrite('4 Sol Ring{Enter}1 Lightning Bolt{Enter}2 Counterspell{Enter}');
    const solRing = tileOf(await screen.findByRole('button', { name: 'Modifica Sol Ring' }));

    dragAndDrop(
      solRing,
      tileOf(screen.getByRole('button', { name: 'Modifica Counterspell' })),
      'after',
    );

    expect(decklistValue()).toBe('1 Lightning Bolt\n2 Counterspell\n4 Sol Ring\n');
    expect(gridTiles().map((tile) => tileSummary(tile)[0])).toEqual([
      'Immagine di Lightning Bolt',
      'Immagine di Counterspell',
      'Immagine di Sol Ring',
    ]);
  });

  it('moves the whole line, all its sibling tiles in the same order', async () => {
    const user = await mountPageAndWrite('1 Lightning Bolt{Enter}4 Sol Ring{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Modifica Sol Ring' }));
    await moveOneCopy(user, 'Sol Ring', 'C21 #1', 'LEA #1');
    const lightningBolt = tileOf(screen.getByRole('button', { name: 'Modifica Lightning Bolt' }));

    const [, lastSolRing] = screen.getAllByRole('button', { name: 'Modifica Sol Ring' });

    dragAndDrop(tileOf(lastSolRing), lightningBolt, 'before');

    expect(decklistValue()).toBe('4 Sol Ring\n1 Lightning Bolt\n');
    expect(gridTiles().map(tileSummary)).toEqual([
      ['Immagine di Sol Ring', '3×', '1/2'],
      ['Immagine di Sol Ring', '1×', '2/2'],
      ['Immagine di Lightning Bolt', '1×', undefined],
    ]);
  });

  it('shows a bar where the line will land while it is dragged, on the side of the pointer', async () => {
    await mountPageAndWrite('4 Sol Ring{Enter}1 Lightning Bolt{Enter}');
    const solRing = tileOf(await screen.findByRole('button', { name: 'Modifica Sol Ring' }));
    const lightningBolt = tileOf(screen.getByRole('button', { name: 'Modifica Lightning Bolt' }));

    dragOver(lightningBolt, solRing, 'before');

    expect(within(solRing).getByRole('separator', { name: 'Punto di arrivo' })).toBeTruthy();

    fireEvent.drop(solRing);
    fireEvent.dragEnd(lightningBolt);

    expect(dropMark()).toBeNull();
  });

  it('lands a line by the nearer edge of a line of sibling tiles, and shows the bar there', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}1 Lightning Bolt{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Modifica Sol Ring' }));
    await moveOneCopy(user, 'Sol Ring', 'C21 #1', 'LEA #1');
    const [firstSibling, lastSibling, lightningBolt] = gridTiles();
    if (!firstSibling || !lastSibling || !lightningBolt) throw new Error('expected three tiles');

    dragOver(lightningBolt, firstSibling, 'after');

    expect(within(firstSibling).getByRole('separator', { name: 'Punto di arrivo' })).toBeTruthy();
    expect(within(lastSibling).queryByRole('separator')).toBeNull();

    holdOver(lastSibling, 'before');

    expect(within(lastSibling).getByRole('separator', { name: 'Punto di arrivo' })).toBeTruthy();
    expect(within(firstSibling).queryByRole('separator')).toBeNull();

    holdOver(firstSibling, 'after');
    fireEvent.drop(firstSibling);
    fireEvent.dragEnd(lightningBolt);

    expect(decklistValue()).toBe('1 Lightning Bolt\n4 Sol Ring\n');
  });

  it('shows no bar over the dragged line itself, and dropping there changes nothing', async () => {
    await mountPageAndWrite('4 Sol Ring{Enter}1 Lightning Bolt{Enter}');
    const solRing = tileOf(await screen.findByRole('button', { name: 'Modifica Sol Ring' }));

    dragOver(solRing, solRing, 'after');
    expect(dropMark()).toBeNull();
    fireEvent.drop(solRing);
    fireEvent.dragEnd(solRing);

    expect(decklistValue()).toBe('4 Sol Ring\n1 Lightning Bolt\n');
  });

  it('moves the line into the section of the tile it is dropped on', async () => {
    await mountPageAndWrite(
      '4 Sol Ring{Enter}1 Lightning Bolt{Enter}Sideboard{Enter}2 Counterspell{Enter}',
    );
    const solRing = tileOf(await screen.findByRole('button', { name: 'Modifica Sol Ring' }));

    dragAndDrop(
      solRing,
      tileOf(screen.getByRole('button', { name: 'Modifica Counterspell' })),
      'before',
    );

    expect(decklistValue()).toBe('1 Lightning Bolt\nSideboard\n4 Sol Ring\n2 Counterspell\n');
    expect(gridSections()).toEqual([
      ['Mazzo 1 carta', ['Immagine di Lightning Bolt']],
      ['Sideboard 6 carte', ['Immagine di Sol Ring', 'Immagine di Counterspell']],
    ]);
  });

  it('opens the sideboard when the line is dropped on it before the decklist has one', async () => {
    await mountPageAndWrite('4 Sol Ring{Enter}1 Lightning Bolt{Enter}');
    const solRing = tileOf(await screen.findByRole('button', { name: 'Modifica Sol Ring' }));
    expect(screen.queryByText('Rilascia qui per il sideboard')).toBeNull();

    startDrag(solRing);
    const sideboardDrop = screen.getByText('Rilascia qui per il sideboard');
    fireEvent.dragOver(sideboardDrop, { dataTransfer: aDataTransfer() });
    fireEvent.drop(sideboardDrop);
    fireEvent.dragEnd(solRing);

    expect(decklistValue()).toBe('1 Lightning Bolt\n\nSideboard\n4 Sol Ring');
    expect(gridSections()).toEqual([
      ['Mazzo 1 carta', ['Immagine di Lightning Bolt']],
      ['Sideboard 4 carte', ['Immagine di Sol Ring']],
    ]);
    expect(screen.queryByText('Rilascia qui per il sideboard')).toBeNull();
  });

  it("keeps the moved line's choices, asking the server nothing, even when the move rewrites it", async () => {
    const user = await mountPageAndWrite(
      '2 Lightning{Enter}2 Sol Ring{Enter}SB: 1 Counterspell{Enter}',
    );
    await pickCandidate(user, 'Lightning Bolt');
    await user.click(await screen.findByRole('button', { name: 'Modifica Sol Ring' }));
    await moveOneCopy(user, 'Sol Ring', 'C21 #1', 'LEA #1');
    const requestsBefore = vi.mocked(api.resolveDecklistText).mock.calls.length;
    // A move gives the tiles after it new places: each drag finds its tiles anew.
    const counterspell = () =>
      tileOf(screen.getByRole('button', { name: 'Modifica Counterspell' }));

    dragAndDrop(
      tileOf(screen.getAllByRole('button', { name: 'Modifica Sol Ring' })[0]),
      counterspell(),
      'after',
    );
    dragAndDrop(
      tileOf(screen.getByRole('button', { name: 'Modifica Lightning Bolt' })),
      counterspell(),
      'before',
    );

    expect(decklistValue()).toBe('SB: 2 Lightning\nSB: 1 Counterspell\nSB: 2 Sol Ring\n');
    expect(gridTiles().map(tileSummary)).toEqual([
      ['Immagine di Lightning Bolt', '2×', undefined],
      ['Immagine di Counterspell', '1×', undefined],
      ['Immagine di Sol Ring', '1×', '1/2'],
      ['Immagine di Sol Ring', '1×', '2/2'],
    ]);
    expect(vi.mocked(api.resolveDecklistText).mock.calls.length).toBe(requestsBefore);
  });

  it('recognises a line not recognised yet once it is moved', async () => {
    await mountPageAndWrite('4 Sol Ring{Enter}SB: 1 Lightning Bolt');
    const solRing = tileOf(await screen.findByRole('button', { name: 'Modifica Sol Ring' }));
    const [, lightningBolt] = gridTiles();

    dragAndDrop(tileOf(lightningBolt), solRing, 'before');

    expect(decklistValue()).toBe('1 Lightning Bolt\n4 Sol Ring');
    expect(await screen.findByRole('button', { name: 'Modifica Lightning Bolt' })).toBeTruthy();
  });

  it('keeps the selected tile selected when its line moves', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}1 Lightning Bolt{Enter}');
    const solRingButton = await screen.findByRole('button', { name: 'Modifica Sol Ring' });
    await user.click(solRingButton);

    dragAndDrop(
      tileOf(solRingButton),
      tileOf(screen.getByRole('button', { name: 'Modifica Lightning Bolt' })),
      'after',
    );

    const selected = gridTiles().filter((tile) => tile.getAttribute('aria-current') === 'true');
    expect(selected.map((tile) => tileSummary(tile)[0])).toEqual(['Immagine di Sol Ring']);
  });

  describe('the grabbing hand', () => {
    /** Whether `tile` shows the grabbing hand, over its card too. */
    function showsGrabbingHand(tile: HTMLElement) {
      return tile.hasAttribute('data-grabbed');
    }

    /** Mounts a grid of one tile and presses it. */
    async function pressSolRing() {
      await mountPageAndWrite('4 Sol Ring{Enter}');
      const tile = tileOf(await screen.findByRole('button', { name: 'Modifica Sol Ring' }));
      expect(showsGrabbingHand(tile)).toBe(false);
      fireEvent.pointerDown(tile, { pointerType: 'mouse' });
      return tile;
    }

    it('shows on a tile while it is pressed, and goes once it is let go', async () => {
      const tile = await pressSolRing();
      expect(showsGrabbingHand(tile)).toBe(true);

      fireEvent.pointerUp(tile, { pointerType: 'mouse' });

      expect(showsGrabbingHand(tile)).toBe(false);
    });

    it('goes once a drag ends, even with the tile dropped where it was', async () => {
      const tile = await pressSolRing();
      startDrag(tile);

      fireEvent.dragEnd(tile);

      expect(showsGrabbingHand(tile)).toBe(false);
    });

    it("covers the card too, whose button would otherwise keep the theme's hand", async () => {
      const tile = await pressSolRing();

      expect(tile.className).toContain('data-grabbed:[&_[data-tile-image-button]]:cursor-grabbing');
      expect(tile.querySelector('[data-tile-image-button]')).toBe(
        screen.getByRole('button', { name: 'Modifica Sol Ring' }),
      );
    });
  });

  it('lets no tile be dragged where touch is the main input, and nothing suggests it', async () => {
    stubScreen({ ...DESKTOP, touchIsMain: true });
    await mountPageAndWrite('4 Sol Ring{Enter}1 Lightning Bolt{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });

    for (const tile of gridTiles()) {
      expect(tile.getAttribute('draggable')).not.toBe('true');
      expect(tile.className).not.toContain('cursor-grab');
    }
  });
});
