import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../../api.ts';
import { mountApp } from '../../test-support/mount-app.tsx';
import {
  mountPageAndWrite,
  pickCandidate,
  moveOneCopy,
  answerApiCallsFromCatalog,
} from '../../test-support/workspace-page.ts';
import {
  cardGrid,
  gridTiles,
  tileAt,
  tileSummary,
  siblingColourOf,
  focusOutlineOf,
} from '../../test-support/grid-queries.ts';

vi.mock('../../api.ts');

beforeEach(answerApiCallsFromCatalog);

describe('the colours of sibling groups in a grid of several columns', () => {
  /**
   * Makes each section of the card grid lay its tiles in `columns` columns, as a browser's
   * layout does: jsdom lays nothing out.
   */
  function layOutCardGridIn(columns: number) {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        readonly onResize: ResizeObserverCallback;
        constructor(onResize: ResizeObserverCallback) {
          this.onResize = onResize;
        }
        observe() {
          this.onResize([{ contentRect: { width: 1200 } } as ResizeObserverEntry], this as never);
        }
        unobserve() {}
        disconnect() {}
      },
    );
    const laidOutColumns = Array.from({ length: columns }, () => '120px').join(' ');
    const computedStyleOf = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudoElement) =>
      element instanceof HTMLElement && element.style.gridTemplateColumns.includes('auto-fill')
        ? ({ gridTemplateColumns: laidOutColumns } as CSSStyleDeclaration)
        : computedStyleOf(element, pseudoElement),
    );
  }

  /** Splits the `nth` line of `card` into two sibling tiles, a copy moving onto the print `to`. */
  async function splitLine(
    user: ReturnType<typeof userEvent.setup>,
    card: string,
    nth: number,
    to: string,
  ) {
    const editButtons = await screen.findAllByRole('button', { name: `Modifica ${card}` });
    const editButton = editButtons[nth];
    if (!editButton) throw new Error(`no line ${nth} of ${card}`);
    await user.click(editButton);
    await user.click(await screen.findByRole('button', { name: `Una copia in più con ${to}` }));
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.mocked(window.getComputedStyle).mockRestore();
  });

  it('never gives a group the colour of the group above it', async () => {
    // 8 columns, five groups of two tiles: the fifth stands under the first.
    layOutCardGridIn(8);
    const user = await mountPageAndWrite(
      '4 Sol Ring{Enter}4 Lightning Bolt{Enter}4 Sol Ring{Enter}4 Lightning Bolt{Enter}4 Sol Ring{Enter}',
    );
    // From the last line up, so the lines still to split keep their place among their card's.
    await splitLine(user, 'Sol Ring', 2, 'LEA #1');
    await splitLine(user, 'Lightning Bolt', 1, 'M10 #1');
    await splitLine(user, 'Sol Ring', 1, 'LEA #1');
    await splitLine(user, 'Lightning Bolt', 0, 'M10 #1');
    await splitLine(user, 'Sol Ring', 0, 'LEA #1');

    const colours = gridTiles().map(siblingColourOf);

    expect(colours).toHaveLength(10);
    expect(colours[8]).toBeTruthy();
    expect(colours[8]).not.toBe(colours[0]);
    expect(colours[9]).not.toBe(colours[1]);
  });

  it('lets two groups with a tile without siblings between them share a colour', async () => {
    layOutCardGridIn(8);
    const user = await mountPageAndWrite('4 Sol Ring{Enter}1 Island{Enter}4 Lightning Bolt{Enter}');
    await splitLine(user, 'Lightning Bolt', 0, 'M10 #1');
    await splitLine(user, 'Sol Ring', 0, 'LEA #1');

    const [solRing, , island, bolt] = gridTiles().map(siblingColourOf);

    expect(island).toBeUndefined();
    expect(solRing).toBeTruthy();
    expect(bolt).toBe(solRing);
  });

  it('lets two groups that only meet at a corner share a colour', async () => {
    // 3 columns: Sol Ring ends the first row in its middle cell; Lightning Bolt starts at the end
    // of the second row, under Island, and wraps under Mountain.
    layOutCardGridIn(3);
    const user = await mountPageAndWrite(
      '4 Sol Ring{Enter}1 Island{Enter}1 Mountain{Enter}1 Ponder{Enter}4 Lightning Bolt{Enter}',
    );
    await splitLine(user, 'Lightning Bolt', 0, 'M10 #1');
    await splitLine(user, 'Sol Ring', 0, 'LEA #1');

    const colours = gridTiles().map(siblingColourOf);

    expect(colours[0]).toBeTruthy();
    expect(colours[5]).toBe(colours[0]);
    expect(colours[6]).toBe(colours[0]);
  });
});

describe('the quantity on a tile', () => {
  it("adds a copy to the tile's print with its plus, and the decklist text says so", async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}1 Lightning Bolt{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Modifica Sol Ring' }));
    await moveOneCopy(user, 'Sol Ring', 'C21 #1', 'LEA #1');

    await user.click(screen.getByRole('button', { name: 'Una copia in più di Sol Ring (LEA #1)' }));

    expect(gridTiles().map(tileSummary)).toEqual([
      ['Immagine di Sol Ring', '3×', '1/2'],
      ['Immagine di Sol Ring', '2×', '2/2'],
      ['Immagine di Lightning Bolt', '1×', undefined],
    ]);
    expect(screen.getByLabelText<HTMLTextAreaElement>('Decklist').value).toBe(
      '5 Sol Ring\n1 Lightning Bolt\n',
    );
  });

  it('takes a tile brought to zero off the grid and keeps its siblings', async () => {
    const user = await mountPageAndWrite('2 Sol Ring{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Modifica Sol Ring' }));
    await moveOneCopy(user, 'Sol Ring', 'C21 #1', 'LEA #1');

    await user.click(
      screen.getByRole('button', { name: 'Una copia in meno di Sol Ring (C21 #1)' }),
    );

    expect(gridTiles().map(tileSummary)).toEqual([['Immagine di Sol Ring', '1×', undefined]]);
    expect(screen.getByLabelText<HTMLTextAreaElement>('Decklist').value).toBe('1 Sol Ring\n');
  });

  it('removes the line from the decklist text with its last tile', async () => {
    const user = await mountPageAndWrite(
      '// my deck{Enter}1 Sol Ring{Enter}{Enter}1 Lightning Bolt{Enter}',
    );
    await screen.findByRole('button', { name: 'Modifica Lightning Bolt' });

    await user.click(
      screen.getByRole('button', { name: 'Una copia in meno di Sol Ring (C21 #1)' }),
    );

    expect(gridTiles().map(tileSummary)).toEqual([['Immagine di Lightning Bolt', '1×', undefined]]);
    expect(screen.getByLabelText<HTMLTextAreaElement>('Decklist').value).toBe(
      '// my deck\n\n1 Lightning Bolt\n',
    );
  });

  it("keeps the line's picked card and its other tiles through a change of quantity, asking the server nothing", async () => {
    const user = await mountPageAndWrite('2 Lightning{Enter}2 Sol Ring{Enter}');
    await pickCandidate(user, 'Lightning Bolt');
    await user.click(await screen.findByRole('button', { name: 'Modifica Sol Ring' }));
    await moveOneCopy(user, 'Sol Ring', 'C21 #1', 'LEA #1');
    const requestsBefore = vi.mocked(api.resolveDecklistText).mock.calls.length;

    await user.click(
      screen.getByRole('button', { name: 'Una copia in più di Lightning Bolt (TST #1)' }),
    );
    await user.click(screen.getByRole('button', { name: 'Una copia in più di Sol Ring (C21 #1)' }));

    expect(gridTiles().map(tileSummary)).toEqual([
      ['Immagine di Lightning Bolt', '3×', undefined],
      ['Immagine di Sol Ring', '2×', '1/2'],
      ['Immagine di Sol Ring', '1×', '2/2'],
    ]);
    expect(screen.getByLabelText<HTMLTextAreaElement>('Decklist').value).toBe(
      '3 Lightning\n3 Sol Ring\n',
    );
    expect(vi.mocked(api.resolveDecklistText).mock.calls.length).toBe(requestsBefore);
  });

  it("keeps each line's own choices when its new quantity makes it read like another line", async () => {
    const user = await mountPageAndWrite('2 Sol Ring{Enter}4 Sol Ring{Enter}');
    await screen.findAllByRole('button', { name: 'Modifica Sol Ring' });
    await user.click(tileAt(1).getByRole('button', { name: 'Modifica Sol Ring' }));
    await user.click(await screen.findByRole('button', { name: 'Una copia in più con LEA #1' }));
    await user.click(
      tileAt(1).getByRole('button', { name: 'Una copia in meno di Sol Ring (C21 #1)' }),
    );

    const onePlusOnFirstLine = () =>
      user.click(tileAt(0).getByRole('button', { name: 'Una copia in più di Sol Ring (C21 #1)' }));
    await onePlusOnFirstLine();
    await onePlusOnFirstLine();

    expect(screen.getByLabelText<HTMLTextAreaElement>('Decklist').value).toBe(
      '4 Sol Ring\n4 Sol Ring\n',
    );
    expect(gridTiles().map(tileSummary)).toEqual([
      ['Immagine di Sol Ring', '4×', undefined],
      ['Immagine di Sol Ring', '3×', '1/2'],
      ['Immagine di Sol Ring', '1×', '2/2'],
    ]);
  });
});

describe('a double-faced card', () => {
  it('shows its front on the tile and turns to its back with the flip button', async () => {
    const user = await mountPageAndWrite('1 Delver of Secrets{Enter}');
    await screen.findByRole('button', {
      name: 'Modifica Delver of Secrets // Insectile Aberration',
    });
    const tile = tileAt(0);
    expect(tile.getByRole('img', { name: 'Immagine di Delver of Secrets' })).toBeTruthy();

    await user.click(tile.getByRole('button', { name: 'Gira Delver of Secrets' }));

    expect(tile.getByRole('img', { name: 'Immagine di Insectile Aberration' })).toBeTruthy();

    await user.click(tile.getByRole('button', { name: 'Gira Delver of Secrets' }));

    expect(tile.getByRole('img', { name: 'Immagine di Delver of Secrets' })).toBeTruthy();
  });

  it('is the only kind of tile with a flip button', async () => {
    await mountPageAndWrite('1 Delver of Secrets{Enter}4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });

    expect(tileAt(0).queryByRole('button', { name: /^Gira / })).toBeTruthy();
    expect(tileAt(1).queryByRole('button', { name: /^Gira / })).toBeNull();
  });
});

describe('the tile width slider', () => {
  /** The narrowest the card grid lets a tile get, as its columns say. */
  function tileMinWidth() {
    const grid = within(cardGrid()).getByRole('list');
    return /minmax\((\d+)px/.exec(grid.style.gridTemplateColumns)?.[1];
  }

  it('makes the tiles bigger or smaller with its slider', async () => {
    await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });

    fireEvent.change(screen.getByRole('slider', { name: 'Zoom' }), { target: { value: '220' } });

    expect(tileMinWidth()).toBe('220');
  });

  it('comes back as the user left it after a reload', async () => {
    await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });
    fireEvent.change(screen.getByRole('slider', { name: 'Zoom' }), { target: { value: '200' } });
    cleanup();

    mountApp('/proxy');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });

    expect(screen.getByRole<HTMLInputElement>('slider', { name: 'Zoom' }).value).toBe('200');
    expect(tileMinWidth()).toBe('200');
  });

  it('opens at its default when the device kept a zoom narrower than the least it allows', async () => {
    localStorage.setItem('mtg-suite.tileWidth', '80');

    await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });

    expect(screen.getByRole<HTMLInputElement>('slider', { name: 'Zoom' }).value).toBe('150');
  });
});

describe('the pile under a tile', () => {
  /** The copies of the card drawn behind the card of each tile of the grid. */
  function pileCopiesPerTile() {
    return gridTiles().map((tile) => [
      ...tile.querySelectorAll<HTMLElement>('[data-copy-pile-copy]'),
    ]);
  }

  it("draws a copy of the card per copy beyond the first, counting the tile's copies, not the line's", async () => {
    const user = await mountPageAndWrite('3 Sol Ring{Enter}1 Lightning Bolt{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Modifica Sol Ring' }));

    await moveOneCopy(user, 'Sol Ring', 'C21 #1', 'LEA #1');

    expect(pileCopiesPerTile().map((copies) => copies.length)).toEqual([1, 0, 0]);
  });

  it('stops growing past five copies', async () => {
    await mountPageAndWrite('6 Sol Ring{Enter}40 Lightning Bolt{Enter}');
    await screen.findByRole('button', { name: 'Modifica Lightning Bolt' });

    expect(pileCopiesPerTile().map((copies) => copies.length)).toEqual([5, 5]);
  });

  it('draws the image of the face the card shows', async () => {
    await mountPageAndWrite('2 Sol Ring{Enter}');
    const card = await screen.findByRole('img', { name: /^Immagine di Sol Ring/ });

    const [copy] = pileCopiesPerTile()[0] ?? [];

    expect(copy?.querySelector('img')?.getAttribute('src')).toBe(card.getAttribute('src'));
  });

  it('outlines the focused tile around its card and the copies of its pile, out to the deepest copy', async () => {
    await mountPageAndWrite('3 Sol Ring{Enter}');
    await screen.findByRole('img', { name: /^Immagine di Sol Ring/ });
    const [tile] = gridTiles();
    const deepestCopy = pileCopiesPerTile()[0]?.[0];

    const outline = focusOutlineOf(tile);

    expect(deepestCopy?.style.transform).toBe('translate(8px, 8px)');
    expect([outline.style.top, outline.style.left]).toEqual(['0px', '0px']);
    expect([outline.style.right, outline.style.bottom]).toEqual(['-8px', '-8px']);
  });

  it('outlines a focused tile of a single copy around its card alone', async () => {
    await mountPageAndWrite('1 Sol Ring{Enter}');
    await screen.findByRole('img', { name: /^Immagine di Sol Ring/ });

    const outline = focusOutlineOf(gridTiles()[0]);

    expect([outline.style.right, outline.style.bottom]).toEqual(['0px', '0px']);
  });

  it('keeps the set and number under the deepest pile clear of the focus line around it', async () => {
    await mountPageAndWrite('6 Sol Ring{Enter}');
    await screen.findByRole('img', { name: /^Immagine di Sol Ring/ });
    const [tile] = gridTiles();
    const outline = focusOutlineOf(tile);
    const setAndNumber = within(tile as HTMLElement).getByText('C21 #1').parentElement;

    const px = (length: string | undefined) => Number.parseFloat(length ?? '');
    const focusBelowCard =
      -px(outline.style.bottom) + px(outline.style.outlineOffset) + px(outline.style.outlineWidth);

    expect(focusBelowCard).toBeGreaterThan(0);
    expect(px(setAndNumber?.style.marginTop)).toBeGreaterThan(focusBelowCard);
  });

  it('keeps the copies decorative: hidden, without alternative text, and deaf to the pointer', async () => {
    await mountPageAndWrite('2 Sol Ring{Enter}');
    await screen.findByRole('img', { name: /^Immagine di Sol Ring/ });

    const [copy] = pileCopiesPerTile()[0] ?? [];

    expect(copy?.getAttribute('aria-hidden')).toBe('true');
    expect(copy?.querySelector('img')?.getAttribute('alt')).toBe('');
    expect(copy?.className).toContain('pointer-events-none');
  });
});
