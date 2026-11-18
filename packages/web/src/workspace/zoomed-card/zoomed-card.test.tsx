import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PRINT_PICKER_ZOOM_WAIT_MS, TILE_ZOOM_WAIT_MS } from './use-zoomed-card.tsx';
import {
  mountPageAndWrite,
  startDrag,
  answerApiCallsFromCatalog,
} from '../../test-support/workspace-page.ts';
import { cardGrid } from '../../test-support/grid-queries.ts';

vi.mock('../../api.ts');

beforeEach(answerApiCallsFromCatalog);

describe('the zoomed card', () => {
  beforeEach(() => {
    // Real time still flows, so the user's typing goes on; the waits are stepped by hand.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    return () => vi.useRealTimers();
  });

  /** The card shown enlarged, if any. */
  function zoomedCard() {
    return screen.queryByRole('img', { name: /, ingrandita$/ });
  }

  /** Makes `element` stand on screen in the box from `left` and `top`, `width` by `height` px. */
  function placeOnScreen(
    element: Element,
    left: number,
    top: number,
    width: number,
    height: number,
  ) {
    const box = { left, top, width, height, right: left + width, bottom: top + height };
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
      ...box,
      x: left,
      y: top,
    } as DOMRect);
  }

  /** Where the zoomed card stands on screen. */
  function zoomedCardBox() {
    const card = zoomedCard();
    if (!card) throw new Error('no zoomed card');
    const [left, top, width, height] = [
      card.style.left,
      card.style.top,
      card.style.width,
      card.style.height,
    ].map(parseFloat) as [number, number, number, number];
    return { left, top, right: left + width, bottom: top + height };
  }

  /** The screen under test: jsdom's window. */
  const screenBox = () => ({ width: window.innerWidth, height: window.innerHeight });

  describe('beside a tile', () => {
    /** Mounts a grid of one tile standing in `box`, and zooms it. */
    async function zoomTheTileAt(...box: [number, number, number, number]) {
      const user = await mountPageAndWrite('4 Sol Ring{Enter}');
      const tile = await screen.findByRole('button', { name: 'Modifica Sol Ring' });
      placeOnScreen(tile, ...box);
      await user.hover(tile);
      act(() => vi.advanceTimersByTime(TILE_ZOOM_WAIT_MS));
      return zoomedCardBox();
    }

    it('stands to the right of its tile, when the screen has room there', async () => {
      const card = await zoomTheTileAt(100, 200, 150, 210);

      expect(card.left).toBeGreaterThan(250);
      expect(card.right).toBeLessThanOrEqual(screenBox().width);
    });

    it('goes to the left of its tile when the right has no room', async () => {
      const card = await zoomTheTileAt(800, 200, 150, 210);

      expect(card.right).toBeLessThan(800);
      expect(card.left).toBeGreaterThanOrEqual(0);
    });

    it('centres on its tile in height', async () => {
      const card = await zoomTheTileAt(100, 200, 150, 210);

      expect((card.top + card.bottom) / 2).toBeCloseTo(305);
    });

    it('stays inside the screen when its tile is near the top or the bottom', async () => {
      const nearTop = await zoomTheTileAt(100, 0, 150, 210);
      expect(nearTop.top).toBeGreaterThanOrEqual(0);
      cleanup();
      localStorage.clear();

      const nearBottom = await zoomTheTileAt(100, screenBox().height - 210, 150, 210);
      expect(nearBottom.bottom).toBeLessThanOrEqual(screenBox().height);
    });
  });

  it('shows the card enlarged once the pointer has rested on its tile for a while', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    const tile = await screen.findByRole('button', { name: 'Modifica Sol Ring' });

    await user.hover(tile);
    act(() => vi.advanceTimersByTime(TILE_ZOOM_WAIT_MS - 100));
    expect(zoomedCard()).toBeNull();
    act(() => vi.advanceTimersByTime(100));

    expect(zoomedCard()?.getAttribute('alt')).toBe('Sol Ring, ingrandita');
  });

  it('shows the face the tile is turned to', async () => {
    const user = await mountPageAndWrite('1 Delver of Secrets{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Gira Delver of Secrets' }));

    await user.hover(screen.getByRole('button', { name: /^Modifica Delver/ }));
    act(() => vi.advanceTimersByTime(TILE_ZOOM_WAIT_MS));

    expect(zoomedCard()?.getAttribute('alt')).toBe('Insectile Aberration, ingrandita');
  });

  describe('goes away', () => {
    /** Mounts a grid of one tile and rests the pointer on it until its card shows enlarged. */
    async function zoomTheTile() {
      const user = await mountPageAndWrite('4 Sol Ring{Enter}');
      const tile = await screen.findByRole('button', { name: 'Modifica Sol Ring' });
      await user.hover(tile);
      act(() => vi.advanceTimersByTime(TILE_ZOOM_WAIT_MS));
      expect(zoomedCard()).toBeTruthy();
      return { user, tile };
    }

    it('when the pointer leaves the tile', async () => {
      const { user, tile } = await zoomTheTile();

      await user.unhover(tile);

      expect(zoomedCard()).toBeNull();
    });

    it('when anything scrolls', async () => {
      await zoomTheTile();

      fireEvent.scroll(cardGrid());

      expect(zoomedCard()).toBeNull();
    });

    it('when the user clicks', async () => {
      const { user, tile } = await zoomTheTile();

      await user.click(tile);

      expect(zoomedCard()).toBeNull();
    });

    it('when a drag starts', async () => {
      const { tile } = await zoomTheTile();

      startDrag(tile);

      expect(zoomedCard()).toBeNull();
    });

    it('before it shows, when the pointer leaves during the wait', async () => {
      const user = await mountPageAndWrite('4 Sol Ring{Enter}');
      const tile = await screen.findByRole('button', { name: 'Modifica Sol Ring' });
      await user.hover(tile);

      await user.unhover(tile);
      act(() => vi.advanceTimersByTime(TILE_ZOOM_WAIT_MS));

      expect(zoomedCard()).toBeNull();
    });
  });

  describe('in the print picker', () => {
    /** Opens Sol Ring's print picker and returns it, with the button of its LEA print. */
    async function openThePicker() {
      const user = await mountPageAndWrite('4 Sol Ring{Enter}');
      await user.click(await screen.findByRole('button', { name: 'Modifica Sol Ring' }));
      const picker = await screen.findByRole('region', { name: 'Stampe di Sol Ring' });
      const [, leaPrint] = await within(picker).findAllByRole('button', {
        name: /^Immagine di Sol Ring/,
      });
      if (!leaPrint) throw new Error('no LEA print in the picker');
      return { user, picker, leaPrint };
    }

    it('shows the hovered print enlarged sooner than on a tile', async () => {
      const { user, leaPrint } = await openThePicker();

      await user.hover(leaPrint);
      act(() => vi.advanceTimersByTime(PRINT_PICKER_ZOOM_WAIT_MS));

      expect(PRINT_PICKER_ZOOM_WAIT_MS).toBeLessThan(TILE_ZOOM_WAIT_MS);
      expect(zoomedCard()?.getAttribute('src')).toBe(
        'https://cards.scryfall.io/large/front/sol-ring-lea.jpg',
      );
    });

    it('stands beside the whole picker, covering none of its prints', async () => {
      const { user, picker, leaPrint } = await openThePicker();
      placeOnScreen(picker, 600, 0, 400, 700);

      await user.hover(leaPrint);
      act(() => vi.advanceTimersByTime(PRINT_PICKER_ZOOM_WAIT_MS));

      expect(zoomedCardBox().right).toBeLessThan(600);
    });

    it('covers the picker rather than leave the screen, when neither side has room', async () => {
      const { user, picker, leaPrint } = await openThePicker();
      placeOnScreen(picker, 100, 0, 900, 700);

      await user.hover(leaPrint);
      act(() => vi.advanceTimersByTime(PRINT_PICKER_ZOOM_WAIT_MS));

      const card = zoomedCardBox();
      expect(card.left).toBeGreaterThanOrEqual(0);
      expect(card.right).toBeLessThanOrEqual(screenBox().width);
    });
  });

  it('never shows on a touch', async () => {
    await mountPageAndWrite('4 Sol Ring{Enter}');
    const tile = await screen.findByRole('button', { name: 'Modifica Sol Ring' });

    // A finger landing on the tile, before it presses: user-event sends no enter for a touch.
    fireEvent.pointerEnter(tile, { pointerType: 'touch' });
    act(() => vi.advanceTimersByTime(TILE_ZOOM_WAIT_MS));

    expect(zoomedCard()).toBeNull();
  });
});
