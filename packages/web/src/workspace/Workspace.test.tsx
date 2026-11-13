import { defaultSheetOptions, type CatalogEntry } from '@mtg-suite/core';
import { aCard, aPrint, jpegOfSize } from '@mtg-suite/core/test-fixtures';
import {
  act,
  cleanup,
  createEvent,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../api.ts';
import { inMemoryServer } from '../in-memory-server.ts';
import { mountApp } from '../mount-app.tsx';
import { DESKTOP, PHONE, stubScreen } from '../test-screen.ts';
import { PRINT_PICKER_ZOOM_WAIT_MS, TILE_ZOOM_WAIT_MS } from '../use-zoomed-card.tsx';

vi.mock('../api.ts');

/** A print of the card `name` from `set`, with its own Scryfall images. */
function printOf(name: string, id: string, set: string, releasedAt = '2020-01-01') {
  const image = (size: string) => `https://cards.scryfall.io/${size}/front/${id}.jpg`;
  return aPrint({
    id,
    set,
    releasedAt,
    printedName: name,
    faces: [
      {
        name,
        imageUris: {
          small: image('small'),
          normal: image('normal'),
          large: image('large'),
          png: `https://cards.scryfall.io/png/front/${id}.png`,
        },
      },
    ],
  });
}

function catalogEntry(oracleId: string, name: string, ...sets: string[]): CatalogEntry {
  return {
    card: aCard({ oracleId, name }),
    // The first set is the newest: the default print.
    prints: (sets.length > 0 ? sets : ['tst']).map((set, index) =>
      printOf(name, `${oracleId}-${set}`, set, `${2020 - index}-01-01`),
    ),
  };
}

/**
 * A card with Italian prints, the newest with a sharp image and the older one with a
 * low-resolution one, and an English print.
 */
const COUNTERSPELL: CatalogEntry = {
  card: aCard({ oracleId: 'counterspell', name: 'Counterspell' }),
  prints: [
    printOf('Counterspell', 'counterspell-a25', 'a25', '2018-03-16'),
    { ...printOf('Counterspell', 'counterspell-it-mh2', 'mh2', '2021-06-18'), lang: 'it' },
    {
      ...printOf('Counterspell', 'counterspell-it-ema', 'ema', '2016-06-10'),
      lang: 'it',
      imageStatus: 'lowres',
    },
  ],
};

/** A card with sharp prints in both languages: two Italian ones and an English one. */
const BRAINSTORM: CatalogEntry = {
  card: aCard({ oracleId: 'brainstorm', name: 'Brainstorm' }),
  prints: [
    { ...printOf('Brainstorm', 'brainstorm-it-ice', 'ice', '2020-01-01'), lang: 'it' },
    { ...printOf('Brainstorm', 'brainstorm-it-mmq', 'mmq', '2019-01-01'), lang: 'it' },
    printOf('Brainstorm', 'brainstorm-c21', 'c21', '2021-01-01'),
  ],
};

/** A double-faced card: its print has a front and a back face, each with its own image. */
const DELVER: CatalogEntry = (() => {
  const front = printOf('Delver of Secrets', 'delver-isd', 'isd');
  const back = printOf('Insectile Aberration', 'delver-isd-back', 'isd').faces;
  return {
    card: aCard({ oracleId: 'delver', name: 'Delver of Secrets // Insectile Aberration' }),
    prints: [{ ...front, faces: [...front.faces, ...back] }],
  };
})();

const CATALOG = [
  catalogEntry('sol-ring', 'Sol Ring', 'c21', 'lea'),
  DELVER,
  BRAINSTORM,
  catalogEntry('lightning-bolt', 'Lightning Bolt', 'tst', 'm10', '2x2'),
  catalogEntry('lightning-helix', 'Lightning Helix'),
  COUNTERSPELL,
  // The rest of the example decklist.
  catalogEntry('ponder', 'Ponder'),
  catalogEntry('island', 'Island'),
  catalogEntry('mountain', 'Mountain'),
  catalogEntry('pyroblast', 'Pyroblast'),
];

beforeEach(() => {
  localStorage.clear();
  // Every call of `api.ts` is answered in memory: one added later is covered without a new line here.
  Object.entries(inMemoryServer(CATALOG)).forEach(([call, answer]) => {
    vi.mocked(api[call as keyof typeof api]).mockImplementation(answer as never);
  });
});

/** Mounts the generator page and types `decklistText` into the decklist, as a user would. */
async function mountPageAndWrite(decklistText: string) {
  const user = userEvent.setup();
  mountApp('/proxy');
  await user.type(screen.getByLabelText('Decklist'), decklistText);
  return user;
}

describe('the generator page', () => {
  it('recognises a line once the user breaks the line', async () => {
    const user = await mountPageAndWrite('1 Lightning Bolt{Enter}4 Sol Ring');
    await screen.findByRole('button', { name: 'Modifica Lightning Bolt' });
    expect(screen.getByText('Da riconoscere: vai a capo o esci dal campo')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Modifica Sol Ring' })).toBeNull();

    await user.keyboard('{Enter}');

    expect(await screen.findByRole('button', { name: 'Modifica Sol Ring' })).toBeTruthy();
  });

  it('resolves an ambiguous line to the candidate the user picks', async () => {
    const user = await mountPageAndWrite('1 Lightning{Enter}');
    expect(await screen.findByText('Quale carta intendevi?')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Lightning Helix' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Lightning Bolt' }));

    expect(screen.getByRole('button', { name: 'Modifica Lightning Bolt' })).toBeTruthy();
    expect(screen.queryByText('Quale carta intendevi?')).toBeNull();
  });

  it('rewrites the decklist text when the quantity changes in the line panel', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}1 Lightning Bolt');
    await user.click(await screen.findByRole('button', { name: 'Modifica Sol Ring' }));

    await user.click(screen.getByRole('button', { name: 'Una copia in più' }));

    expect(screen.getByLabelText<HTMLTextAreaElement>('Decklist').value).toBe(
      '5 Sol Ring\n1 Lightning Bolt',
    );
  });

  it('keeps the PDF button disabled until every line is resolved', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}1 Lightning Bolt');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });
    const pdfButton = screen.getByRole<HTMLButtonElement>('button', { name: 'Scarica il PDF' });
    expect(pdfButton.disabled).toBe(true);

    await user.keyboard('{Enter}');
    await screen.findByRole('button', { name: 'Modifica Lightning Bolt' });

    expect(pdfButton.disabled).toBe(false);
  });
});

/** The card grid, every section of it. */
function cardGrid() {
  return screen.getByRole('region', { name: 'Griglia delle carte' });
}

/** The tiles of `container`, in the order it shows them, leaving out the add tiles. */
function tilesIn(container: HTMLElement) {
  return within(container)
    .getAllByRole('listitem')
    .filter((item) => !within(item).queryByRole('button', { name: /^Aggiungi una carta a / }));
}

/** The tiles of the card grid, in the order the grid shows them. */
function gridTiles() {
  return tilesIn(cardGrid());
}

/** Each section of the card grid: its title with its card count, and the images of its tiles. */
function gridSections() {
  return within(cardGrid())
    .getAllByRole('region')
    .map((section) => [
      within(section).getByRole('heading').textContent,
      tilesIn(section).map((tile) => tileSummary(tile)[0]),
    ]);
}

/** The tile at `index` in the card grid, to query inside it. */
function tileAt(index: number) {
  const tile = gridTiles()[index];
  if (!tile) throw new Error(`no tile at ${index}`);
  return within(tile);
}

/** What a tile shows: its image, its quantity and, among siblings, which of them it is. */
function tileSummary(tile: HTMLElement) {
  return [
    within(tile)
      .queryByRole('img', { name: /^Immagine di / })
      ?.getAttribute('alt'),
    within(tile).queryByText(/×$/)?.textContent,
    within(tile).queryByText(/^\d+\/\d+$/)?.textContent,
  ];
}

describe('the workspace', () => {
  it('shows the decklist as tiles in the order of the text, each with its image and quantity', async () => {
    await mountPageAndWrite('4 Sol Ring{Enter}1 Lightning Bolt{Enter}');
    await screen.findByRole('button', { name: 'Modifica Lightning Bolt' });

    expect(gridTiles().map(tileSummary)).toEqual([
      ['Immagine di Sol Ring', '4×', undefined],
      ['Immagine di Lightning Bolt', '1×', undefined],
    ]);
  });

  it('shows a new sibling tile next to its origin as soon as copies move onto another print', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}1 Lightning Bolt{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Modifica Sol Ring' }));

    await user.click(await screen.findByRole('button', { name: 'Una copia in più con LEA #1' }));

    expect(gridTiles().map(tileSummary)).toEqual([
      ['Immagine di Sol Ring', '3×', '1/2'],
      ['Immagine di Sol Ring', '1×', '2/2'],
      ['Immagine di Lightning Bolt', '1×', undefined],
    ]);
  });

  it('shows each section under its title with its card count, in a fixed order, its tiles in the order of the text', async () => {
    await mountPageAndWrite(
      '4 Sol Ring{Enter}SB: 1 Lightning Bolt{Enter}Sideboard{Enter}2 Counterspell{Enter}Commander{Enter}1 Brainstorm{Enter}',
    );
    await screen.findByRole('button', { name: 'Modifica Brainstorm' });

    expect(gridSections()).toEqual([
      ['Comandante 1 carta', ['Immagine di Brainstorm']],
      ['Mazzo 4 carte', ['Immagine di Sol Ring']],
      ['Sideboard 3 carte', ['Immagine di Lightning Bolt', 'Immagine di Counterspell']],
    ]);
  });

  it('shows no title for a section with no cards in it', async () => {
    await mountPageAndWrite('4 Sol Ring{Enter}Sideboard{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });

    expect(gridSections()).toEqual([['Mazzo 4 carte', ['Immagine di Sol Ring']]]);
  });

  it('shows the lands section between the main deck and the sideboard', async () => {
    await mountPageAndWrite('Sideboard{Enter}2 Counterspell{Enter}Lands{Enter}4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });

    expect(gridSections()).toEqual([
      ['Terre 4 carte', ['Immagine di Sol Ring']],
      ['Sideboard 2 carte', ['Immagine di Counterspell']],
    ]);
  });

  it('shows a section of cards it could not find under its title, counting them as the summary does', async () => {
    await mountPageAndWrite('4 Sol Ring{Enter}Sideboard{Enter}2 Nonexistent Card{Enter}');
    await screen.findByText('Carta non trovata');

    expect(gridSections()).toEqual([
      ['Mazzo 4 carte', ['Immagine di Sol Ring']],
      ['Sideboard 2 carte', [undefined]],
    ]);
  });

  it("shows the selected tile's quantity and prints in the inspector, beside the grid", async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');

    await user.click(await screen.findByRole('button', { name: 'Modifica Sol Ring' }));

    const inspector = within(screen.getByRole('complementary', { name: 'Riga selezionata' }));
    expect(inspector.getByRole('group', { name: 'Copie' })).toBeTruthy();
    expect(await inspector.findByRole('region', { name: 'Stampe di Sol Ring' })).toBeTruthy();
    expect(gridTiles()).toHaveLength(1);
  });

  it('gives a line that names no card an imageless tile that says so', async () => {
    await mountPageAndWrite('4 Sol Ring{Enter}2 Nonexistent Card{Enter}');

    await screen.findByText('Carta non trovata');

    const [, notFound] = gridTiles();
    expect(notFound && tileSummary(notFound)).toEqual([undefined, undefined, undefined]);
    expect(notFound?.textContent).toContain('2 Nonexistent Card');
  });

  it('switches to the sheet view, with the page, the 100% reminder and the sheet options', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}2 Nonexistent Card{Enter}');
    await screen.findByText('Carta non trovata');

    await user.click(screen.getByRole('button', { name: 'Foglio' }));

    expect(screen.getByRole('img', { name: 'Pagina 1 di 1 come verrà stampata' })).toBeTruthy();
    expect(screen.getByRole('note').textContent).toContain('Stampa al 100%');
    expect(screen.getByText(/^1 riga non verrà stampata/)).toBeTruthy();
    const inspector = within(screen.getByRole('complementary', { name: 'Opzioni del foglio' }));
    expect(inspector.getByLabelText('Formato della pagina')).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Griglia delle carte' })).toBeNull();
  });

  it('keeps the PDF button in reach in both views', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });
    expect(screen.getByRole('button', { name: 'Scarica il PDF' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Foglio' }));

    expect(screen.getByRole('button', { name: 'Scarica il PDF' })).toBeTruthy();
  });

  it('lets go of the selected tile when a line is written above it, never showing another line', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}1 Lightning Bolt{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Modifica Lightning Bolt' }));
    expect(screen.getByRole('complementary', { name: 'Riga selezionata' })).toBeTruthy();

    const decklist = screen.getByLabelText<HTMLTextAreaElement>('Decklist');
    decklist.setSelectionRange(0, 0);
    await user.type(decklist, '2 Lightning Helix{Enter}', {
      initialSelectionStart: 0,
      initialSelectionEnd: 0,
    });

    expect(screen.getByRole('complementary', { name: 'Riepilogo' })).toBeTruthy();
  });

  it('keeps the selection on its line when every copy leaves the selected print', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Modifica Sol Ring' }));

    const oneMoreOnLea = await screen.findByRole('button', { name: 'Una copia in più con LEA #1' });
    for (let copy = 0; copy < 4; copy += 1) await user.click(oneMoreOnLea);

    const [onlyTile] = gridTiles();
    expect(onlyTile && tileSummary(onlyTile)).toEqual(['Immagine di Sol Ring', '4×', undefined]);
    const tileButton = screen.getByRole('button', { name: 'Modifica Sol Ring' });
    expect(tileButton.getAttribute('aria-pressed')).toBe('true');
  });
});

describe('the quantity on a tile', () => {
  it("adds a copy to the tile's print with its plus, and the decklist text says so", async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}1 Lightning Bolt{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Modifica Sol Ring' }));
    await user.click(await screen.findByRole('button', { name: 'Una copia in più con LEA #1' }));

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
    await user.click(await screen.findByRole('button', { name: 'Una copia in più con LEA #1' }));

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
    await user.click(await screen.findByRole('button', { name: 'Lightning Bolt' }));
    await user.click(await screen.findByRole('button', { name: 'Modifica Sol Ring' }));
    await user.click(await screen.findByRole('button', { name: 'Una copia in più con LEA #1' }));
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
    fireEvent.change(screen.getByRole('slider', { name: 'Zoom' }), { target: { value: '100' } });
    cleanup();

    mountApp('/proxy');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });

    expect(screen.getByRole<HTMLInputElement>('slider', { name: 'Zoom' }).value).toBe('100');
    expect(tileMinWidth()).toBe('100');
  });
});

describe('the pile under a tile', () => {
  /** How many card edges the pile under each tile of the grid draws. */
  function pileEdgesPerTile() {
    return gridTiles().map((tile) => tile.querySelectorAll('[data-copy-pile-edge]').length);
  }

  it("draws a card edge per copy beyond the first, counting the tile's copies, not the line's", async () => {
    const user = await mountPageAndWrite('3 Sol Ring{Enter}1 Lightning Bolt{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Modifica Sol Ring' }));

    await user.click(await screen.findByRole('button', { name: 'Una copia in più con LEA #1' }));

    expect(pileEdgesPerTile()).toEqual([1, 0, 0]);
  });

  it('stops growing past five edges', async () => {
    await mountPageAndWrite('6 Sol Ring{Enter}40 Lightning Bolt{Enter}');
    await screen.findByRole('button', { name: 'Modifica Lightning Bolt' });

    expect(pileEdgesPerTile()).toEqual([5, 5]);
  });
});

describe('copies of a line in another language', () => {
  /** The inspector while a tile is selected. */
  function lineInspector() {
    return within(screen.getByRole('complementary', { name: 'Riga selezionata' }));
  }

  /** Opens the tile of the first line, an Italian one on a first visit. */
  async function openBrainstorm() {
    const user = await mountPageAndWrite('4 Brainstorm{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Modifica Brainstorm' }));
    return user;
  }

  it('switches the print picker to English prints, and allocates copies to both languages', async () => {
    const user = await openBrainstorm();
    const printsLanguage = () =>
      within(lineInspector().getByRole('group', { name: 'Lingua delle stampe' }));
    await user.click(await screen.findByRole('button', { name: 'Una copia in più con MMQ #1' }));

    await user.click(printsLanguage().getByRole('radio', { name: 'Inglese' }));
    await user.click(await screen.findByRole('button', { name: 'Una copia in più con C21 #1' }));

    expect(screen.queryByRole('button', { name: 'Una copia in più con MMQ #1' })).toBeNull();
    expect(gridTiles().map(tileSummary)).toEqual([
      ['Immagine di Brainstorm', '2×', '1/3'],
      ['Immagine di Brainstorm', '1×', '2/3'],
      ['Immagine di Brainstorm', '1×', '3/3'],
    ]);
    expect(screen.queryByRole('img', { name: 'Stampa in inglese' })).toBeNull();
  });

  it('counts the copies left unallocated beside the switch, whichever language it shows', async () => {
    const user = await openBrainstorm();
    const printsLanguage = within(
      await lineInspector().findByRole('group', { name: 'Lingua delle stampe' }),
    );
    await user.click(await screen.findByRole('button', { name: 'Una copia in più con MMQ #1' }));

    await user.click(printsLanguage.getByRole('radio', { name: 'Inglese' }));
    await screen.findByRole('button', { name: 'Una copia in più con C21 #1' });

    expect(lineInspector().getByText('+3 non assegnate')).toBeTruthy();
  });

  it('sets no language of its own on a line: only the prints of its copies have one', async () => {
    await openBrainstorm();

    expect(await lineInspector().findByRole('group', { name: 'Lingua delle stampe' })).toBeTruthy();
    expect(lineInspector().queryByRole('group', { name: 'Lingua di questa carta' })).toBeNull();
  });

  it('shows the English prints in the print picker as the way out of a low-resolution print', async () => {
    const user = await mountPageAndWrite('4 Counterspell{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Modifica Counterspell' }));
    await user.click(await screen.findByRole('button', { name: 'Una copia in più con EMA #1' }));
    await user.click(tileAt(1).getByRole('button', { name: 'Modifica Counterspell' }));

    await user.click(lineInspector().getByRole('button', { name: 'Mostra le stampe inglesi' }));

    expect(await screen.findByRole('button', { name: 'Una copia in più con A25 #1' })).toBeTruthy();
    expect(gridTiles()).toHaveLength(2);
  });

  it('keeps the allocated copies on their print once the default language changes', async () => {
    const user = await openBrainstorm();
    await user.click(await screen.findByRole('button', { name: 'Una copia in più con MMQ #1' }));
    await user.click(screen.getByRole('button', { name: 'Modifica Brainstorm', pressed: true }));

    await user.click(summary().getByRole('radio', { name: 'Inglese' }));

    await user.click(tileAt(0).getByRole('button', { name: 'Modifica Brainstorm' }));
    expect(await screen.findByRole('button', { name: 'Una copia in più con C21 #1' })).toBeTruthy();
    expect(gridTiles().map(tileSummary)).toEqual([
      ['Immagine di Brainstorm', '3×', '1/2'],
      ['Immagine di Brainstorm', '1×', '2/2'],
    ]);
  });
});

/** The inspector while no tile is selected. */
function summary() {
  return within(screen.getByRole('complementary', { name: 'Riepilogo' }));
}

/** The value the summary gives next to `term`. */
function summaryValue(term: string) {
  return summary().getByText(term, { selector: 'dt' }).nextElementSibling?.textContent;
}

describe('the decklist summary', () => {
  it('counts the cards, the pages and the lines to fix while no tile is selected', async () => {
    // Nine cards fill an A4 page; the last line, still to recognise, is a line to fix too.
    await mountPageAndWrite('9 Sol Ring{Enter}2 Nonexistent Card{Enter}1 Lightning{Enter}1 Sol');
    await screen.findByText('Carta non trovata');

    expect(summaryValue('Carte')).toBe('12');
    expect(summaryValue('Pagine')).toBe('1');
    expect(summary().getByRole('button', { name: '3 righe da sistemare' })).toBeTruthy();
  });

  it('prints every section: the sideboard counts towards the cards and the pages', async () => {
    // Eight main-deck cards fill most of an A4 page: the sideboard's two need a second one.
    await mountPageAndWrite('8 Sol Ring{Enter}Sideboard{Enter}2 Counterspell{Enter}');
    await screen.findByRole('button', { name: 'Modifica Counterspell' });

    expect(summaryValue('Carte')).toBe('10');
    expect(summaryValue('Pagine')).toBe('2');
  });

  it('brings the first line to fix into view and selects it', async () => {
    const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView');
    const user = await mountPageAndWrite(
      '4 Sol Ring{Enter}2 Nonexistent Card{Enter}1 Lightning{Enter}',
    );
    await screen.findByText('Carta non trovata');

    await user.click(summary().getByRole('button', { name: '2 righe da sistemare' }));

    const [, notFound] = gridTiles();
    expect(notFound?.getAttribute('aria-current')).toBe('true');
    expect(scrollIntoView.mock.contexts).toContain(notFound);
  });

  it('takes the lines to fix in the order of the text, whatever section the grid shows them in', async () => {
    const user = await mountPageAndWrite(
      '2 Nonexistent Card{Enter}Commander{Enter}1 Nonexistent Commander{Enter}',
    );
    await screen.findAllByText('Carta non trovata');

    await user.click(summary().getByRole('button', { name: '2 righe da sistemare' }));

    const selected = gridTiles().find((tile) => tile.getAttribute('aria-current') === 'true');
    expect(selected?.textContent).toContain('2 Nonexistent Card');
  });

  it('marks a tile whose print has a warning, outside its image, and the line panel says what', async () => {
    // A first visit asks for Italian cards, and the catalog holds no Italian print.
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    const tileButton = await screen.findByRole('button', { name: 'Modifica Sol Ring' });

    const mark = screen.getByRole('img', { name: 'Stampa in inglese' });
    expect(tileButton.contains(mark)).toBe(false);
    await user.click(tileButton);
    const inspector = within(screen.getByRole('complementary', { name: 'Riga selezionata' }));
    expect(
      inspector.getByText(
        "Nessuna stampa in italiano con un'immagine: viene usata quella inglese.",
      ),
    ).toBeTruthy();
  });

  it('says in the line panel the warning of the tile it was opened from', async () => {
    const lowResolutionNote = "L'immagine di questa stampa è a bassa risoluzione.";
    const user = await mountPageAndWrite('4 Counterspell{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Modifica Counterspell' }));
    await user.click(await screen.findByRole('button', { name: 'Una copia in più con EMA #1' }));
    const inspector = () => within(screen.getByRole('complementary', { name: 'Riga selezionata' }));

    const lowResolutionMark = { name: 'Immagine a bassa risoluzione' };
    expect(tileAt(0).queryByRole('img', lowResolutionMark)).toBeNull();
    expect(inspector().queryByText(lowResolutionNote)).toBeNull();

    await user.click(tileAt(1).getByRole('button', { name: 'Modifica Counterspell' }));

    expect(tileAt(1).getByRole('img', lowResolutionMark)).toBeTruthy();
    expect(inspector().getByText(lowResolutionNote)).toBeTruthy();
  });

  it('switches every line to the language picked in the summary', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    expect(await screen.findByRole('img', { name: 'Stampa in inglese' })).toBeTruthy();

    await user.click(summary().getByRole('radio', { name: 'Inglese' }));

    await waitFor(() =>
      expect(screen.queryByRole('img', { name: 'Stampa in inglese' })).toBeNull(),
    );
    expect(screen.getByRole('button', { name: 'Modifica Sol Ring' })).toBeTruthy();
  });

  it('shows the line to fix in the inspector, where an ambiguous one picks its card', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}1 Lightning{Enter}');
    await user.click(await summary().findByRole('button', { name: '1 riga da sistemare' }));

    const lineToFix = within(screen.getByRole('complementary', { name: 'Riga da sistemare' }));
    expect(lineToFix.getByText('1 Lightning')).toBeTruthy();
    await user.click(lineToFix.getByRole('button', { name: 'Lightning Bolt' }));

    const inspector = within(screen.getByRole('complementary', { name: 'Riga selezionata' }));
    expect(inspector.getByRole('heading', { name: 'Lightning Bolt' })).toBeTruthy();
  });

  it('goes back to the summary from a line to fix', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}2 Nonexistent Card{Enter}');
    await user.click(await summary().findByRole('button', { name: '1 riga da sistemare' }));
    const lineToFix = within(screen.getByRole('complementary', { name: 'Riga da sistemare' }));
    expect(lineToFix.getByText('Correggi la riga nella lista: non verrà stampata.')).toBeTruthy();

    await user.click(lineToFix.getByRole('button', { name: 'Torna al riepilogo' }));

    expect(summary().getByRole('button', { name: '1 riga da sistemare' })).toBeTruthy();
  });

  it('shows no counter once every line is fixed', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}1 Lightning{Enter}');
    await screen.findByText('Quale carta intendevi?');
    expect(summary().getByRole('button', { name: '1 riga da sistemare' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Lightning Bolt' }));

    expect(summary().queryByRole('button', { name: /da sistemare$/ })).toBeNull();
  });
});

/** The bar at the foot of a phone's screen, which picks the step. */
function stepBar() {
  return within(screen.getByRole('navigation', { name: 'Passi' }));
}

describe('the workspace on a phone', () => {
  beforeEach(() => {
    stubScreen(PHONE);
    return () => vi.unstubAllGlobals();
  });

  it('shows one step at a time on the whole screen, picked from the bottom bar', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    expect(screen.queryByRole('region', { name: 'Griglia delle carte' })).toBeNull();

    await user.click(stepBar().getByRole('button', { name: 'Carte' }));

    expect(await screen.findByRole('button', { name: 'Modifica Sol Ring' })).toBeTruthy();
    expect(screen.queryByLabelText('Decklist')).toBeNull();

    await user.click(stepBar().getByRole('button', { name: 'Foglio' }));

    expect(screen.getByRole('img', { name: 'Pagina 1 di 1 come verrà stampata' })).toBeTruthy();
    expect(screen.getByLabelText('Formato della pagina')).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Griglia delle carte' })).toBeNull();

    await user.click(stepBar().getByRole('button', { name: 'Lista' }));

    expect(screen.getByLabelText<HTMLTextAreaElement>('Decklist').value).toBe('4 Sol Ring\n');
  });

  it('counts the recognised cards and the pages in the top bar, in every step', async () => {
    // Nine cards fill an A4 page; the line still to recognise counts for nothing yet.
    const user = await mountPageAndWrite('9 Sol Ring{Enter}2 Nonexistent Card{Enter}1 Lightning');
    const topBar = within(screen.getByRole('banner'));
    expect(await topBar.findByText('11 carte · 1 pagina')).toBeTruthy();

    await user.keyboard('{Enter}');
    expect(await topBar.findByText('12 carte · 1 pagina')).toBeTruthy();
    await user.click(stepBar().getByRole('button', { name: 'Carte' }));
    await user.click(screen.getByRole('button', { name: 'Lightning Bolt' }));

    expect(topBar.getByText('12 carte · 2 pagine')).toBeTruthy();
  });

  it("raises the tapped tile's line panel from the bottom, with the inspector's settings", async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await user.click(stepBar().getByRole('button', { name: 'Carte' }));

    await user.click(screen.getByRole('button', { name: 'Modifica Sol Ring' }));

    const panel = within(screen.getByRole('dialog', { name: 'Riga selezionata' }));
    expect(panel.getByRole('group', { name: 'Copie' })).toBeTruthy();
    expect(await panel.findByRole('region', { name: 'Stampe di Sol Ring' })).toBeTruthy();
    await user.click(panel.getByRole('button', { name: 'Una copia in più' }));
    await user.click(panel.getByRole('button', { name: 'Fatto' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(gridTiles().map(tileSummary)).toEqual([['Immagine di Sol Ring', '5×', undefined]]);
    const tileButton = screen.getByRole('button', { name: 'Modifica Sol Ring' });
    expect(tileButton.getAttribute('aria-pressed')).toBe('false');
  });

  it('folds the "Lista" and "Riepilogo" panels down to their title, and opens them again', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    const decklist = screen.getByRole('textbox', { name: 'Decklist' });

    await user.click(screen.getByRole('button', { name: 'Richiudi il pannello «Lista»' }));
    await user.click(screen.getByRole('button', { name: 'Richiudi il pannello «Riepilogo»' }));

    expect(screen.getByRole('region', { name: 'Lista' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Riepilogo' })).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: 'Decklist' })).toBeNull();
    expect(screen.queryByRole('group', { name: 'Lingua delle carte' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Riapri il pannello «Lista»' }));

    expect(screen.getByRole('textbox', { name: 'Decklist' })).toBe(decklist);
    expect(screen.queryByRole('group', { name: 'Lingua delle carte' })).toBeNull();
  });

  it('makes the PDF in a step of its own and hands it to the share menu of a phone that can', async () => {
    const share = vi.fn(async () => {});
    vi.stubGlobal('navigator', { ...navigator, canShare: () => true, share });
    vi.mocked(api.fetchImages).mockImplementation(
      async (urls) => new Map(urls.map((url) => [url, jpegOfSize(488, 680)])),
    );
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');

    await user.click(stepBar().getByRole('button', { name: 'PDF' }));

    expect(screen.getByRole('note').textContent).toContain('Stampa al 100%');
    expect(screen.queryByLabelText('Decklist')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Crea il PDF' }));
    await user.click(await screen.findByRole('button', { name: 'Salva o condividi' }));

    expect(share).toHaveBeenCalledWith({
      files: [expect.objectContaining({ name: 'proxy-mtg-suite.pdf', type: 'application/pdf' })],
    });
  });

  it('goes to the "Carte" step from the counter of lines to fix, the first one open in its panel', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}2 Nonexistent Card{Enter}');
    await screen.findByRole('button', { name: '1 riga da sistemare' });

    await user.click(screen.getByRole('button', { name: '1 riga da sistemare' }));

    const panel = within(screen.getByRole('dialog', { name: 'Riga da sistemare' }));
    expect(panel.getByText('2 Nonexistent Card')).toBeTruthy();
    await user.click(panel.getByRole('button', { name: 'Fatto' }));

    expect(stepBar().getByRole('button', { name: 'Carte' }).getAttribute('aria-current')).toBe(
      'step',
    );
  });

  it('keeps the place of a banner under the top bar in the "Lista" step only', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    expect(document.querySelectorAll('[data-ad-slot]')).toHaveLength(1);

    await user.click(stepBar().getByRole('button', { name: 'Carte' }));

    expect(document.querySelectorAll('[data-ad-slot]')).toHaveLength(0);
  });
});

describe('the side panels on a wide screen', () => {
  it('folds the decklist panel down to a strip with its title from the tab on its edge, and opens it again', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });
    const decklist = screen.getByRole('textbox', { name: 'Decklist' });

    await user.click(screen.getByRole('button', { name: 'Richiudi il pannello «Lista»' }));

    const strip = screen.getByRole('region', { name: 'Lista' });
    expect(within(strip).getByRole('heading', { name: 'Lista' })).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: 'Decklist' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Riapri il pannello «Lista»' }));

    expect(screen.getByRole('textbox', { name: 'Decklist' })).toBe(decklist);
  });

  it('folds the inspector down to a strip with the title of what it shows', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });

    await user.click(screen.getByRole('button', { name: 'Richiudi il pannello «Riepilogo»' }));

    const strip = screen.getByRole('complementary', { name: 'Riepilogo' });
    expect(within(strip).getByRole('heading', { name: 'Riepilogo' })).toBeTruthy();
    expect(screen.queryByRole('group', { name: 'Lingua delle carte' })).toBeNull();
  });

  it('has the tab on its edge as the only control that folds a panel', async () => {
    await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });

    expect(
      screen.getAllByRole('button', { name: /^Richiudi il pannello/ }).map((tab) => tab.title),
    ).toEqual(['Richiudi il pannello «Lista»', 'Richiudi il pannello «Riepilogo»']);
  });

  it('widens and narrows a panel from the keyboard on its edge, its edge moving the way the arrow points', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });
    const decklistEdge = screen.getByRole('separator', { name: 'Allarga o stringi «Lista»' });
    const inspectorEdge = screen.getByRole('separator', { name: 'Allarga o stringi «Riepilogo»' });

    decklistEdge.focus();
    await user.keyboard('{ArrowRight}{ArrowRight}');
    inspectorEdge.focus();
    await user.keyboard('{ArrowLeft}');

    expect(decklistEdge.getAttribute('aria-valuenow')).toBe('280');
    expect(screen.getByRole('region', { name: 'Lista' }).style.width).toBe('280px');
    expect(inspectorEdge.getAttribute('aria-valuenow')).toBe('360');
    expect(screen.getByRole('complementary', { name: 'Riepilogo' }).style.width).toBe('360px');
  });

  it('keeps a panel between its narrowest and its widest, leaving the grid room', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });
    const edge = screen.getByRole('separator', { name: 'Allarga o stringi «Lista»' });
    expect([edge.getAttribute('aria-valuemin'), edge.getAttribute('aria-valuemax')]).toEqual([
      '190',
      '420',
    ]);

    edge.focus();
    await user.keyboard('{End}{ArrowRight}');
    expect(edge.getAttribute('aria-valuenow')).toBe('420');

    await user.keyboard('{Home}{ArrowLeft}');
    expect(edge.getAttribute('aria-valuenow')).toBe('190');
  });

  it('follows the pointer dragging its edge, within its widest, until the button is let go', async () => {
    await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });
    const edge = screen.getByRole('separator', { name: 'Allarga o stringi «Riepilogo»' });

    fireEvent.pointerDown(edge, { button: 0, clientX: 900 });
    fireEvent.pointerMove(window, { clientX: 870 });
    expect(edge.getAttribute('aria-valuenow')).toBe('370');
    fireEvent.pointerMove(window, { clientX: 500 });
    expect(edge.getAttribute('aria-valuenow')).toBe('520');
    fireEvent.pointerUp(window);
    fireEvent.pointerMove(window, { clientX: 950 });

    expect(edge.getAttribute('aria-valuenow')).toBe('520');
  });

  it('comes back after a reload folded or open, and as wide, as the user left it', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });
    screen.getByRole('separator', { name: 'Allarga o stringi «Lista»' }).focus();
    await user.keyboard('{ArrowRight}');
    await user.click(screen.getByRole('button', { name: 'Richiudi il pannello «Riepilogo»' }));
    cleanup();

    mountApp('/proxy');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });

    expect(screen.getByRole('region', { name: 'Lista' }).style.width).toBe('260px');
    expect(screen.getByRole('button', { name: 'Riapri il pannello «Riepilogo»' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Riapri il pannello «Riepilogo»' }));
    expect(screen.getByRole('complementary', { name: 'Riepilogo' }).style.width).toBe('340px');
  });

  it('starts open at its usual width when what the device kept of it cannot be read', async () => {
    localStorage.setItem('mtg-suite.sidePanel.decklist', '{"isOpen": "no", "width": 9000}');
    localStorage.setItem('mtg-suite.sidePanel.inspector', 'not json');

    await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });

    expect(screen.getByRole('region', { name: 'Lista' }).style.width).toBe('240px');
    expect(screen.getByRole('complementary', { name: 'Riepilogo' }).style.width).toBe('340px');
  });
});

describe('the workspace across screen sizes', () => {
  it('keeps the text and the selected tile when a wide screen narrows to a phone, open in its line panel', async () => {
    const screenSize = stubScreen(DESKTOP);
    const user = await mountPageAndWrite('4 Sol Ring{Enter}1 Lightning Bolt{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Modifica Lightning Bolt' }));

    act(() => screenSize.resize(false));

    const panel = within(screen.getByRole('dialog', { name: 'Riga selezionata' }));
    expect(panel.getByRole('heading', { name: 'Lightning Bolt' })).toBeTruthy();
    await user.click(panel.getByRole('button', { name: 'Fatto' }));
    await user.click(stepBar().getByRole('button', { name: 'Lista' }));
    expect(screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Decklist' }).value).toBe(
      '4 Sol Ring\n1 Lightning Bolt\n',
    );
  });
});

/** The text of the decklist editor. */
function decklistValue() {
  return screen.getByLabelText<HTMLTextAreaElement>('Decklist').value;
}

/** The grid tile showing `button`, the list item a mouse drags. */
function tileOf(button: HTMLElement | undefined): HTMLElement {
  const tile = button?.closest('li');
  if (!tile) throw new Error('the button is in no tile');
  return tile;
}

/** What a browser hands every event of a drag; jsdom makes none. */
function aDataTransfer() {
  return { setData: () => {}, dropEffect: 'none', effectAllowed: 'all' };
}

/** Starts dragging `element` with the mouse, as a browser does. */
function startDrag(element: HTMLElement) {
  fireEvent.dragStart(element, { dataTransfer: aDataTransfer() });
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
    await user.click(await screen.findByRole('button', { name: 'Una copia in più con LEA #1' }));
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
    await user.click(await screen.findByRole('button', { name: 'Una copia in più con LEA #1' }));
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
    await user.click(await screen.findByRole('button', { name: 'Lightning Bolt' }));
    await user.click(await screen.findByRole('button', { name: 'Modifica Sol Ring' }));
    await user.click(await screen.findByRole('button', { name: 'Una copia in più con LEA #1' }));
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

describe('the empty workspace', () => {
  it('puts the explanation, the decklist text and the example button at the centre, with no other zone', () => {
    mountApp('/proxy');

    expect(screen.getByText(/^Incolla o scrivi una decklist, una carta per riga/)).toBeTruthy();
    expect(screen.getByLabelText('Decklist')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Prova con un esempio' })).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: 'Viste' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Griglia delle carte' })).toBeNull();
    expect(screen.queryByRole('complementary')).toBeNull();
  });

  it('gives way to the grid as soon as the first line is recognised, the user still typing in the decklist', async () => {
    const user = await mountPageAndWrite('4 Sol Ring');
    expect(screen.queryByRole('region', { name: 'Griglia delle carte' })).toBeNull();

    await user.keyboard('{Enter}');

    expect(await screen.findByRole('button', { name: 'Modifica Sol Ring' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Prova con un esempio' })).toBeNull();
    await user.keyboard('1 Brainstorm');
    expect(decklistValue()).toBe('4 Sol Ring\n1 Brainstorm');
  });

  it('comes back once the decklist text is emptied', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });

    await user.clear(screen.getByLabelText('Decklist'));

    expect(screen.getByRole('button', { name: 'Prova con un esempio' })).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Griglia delle carte' })).toBeNull();
  });

  it('loads the example decklist, recognised to its last line as one written by hand', async () => {
    const user = userEvent.setup();
    mountApp('/proxy');

    await user.click(screen.getByRole('button', { name: 'Prova con un esempio' }));

    expect(await screen.findByRole('button', { name: 'Modifica Pyroblast' })).toBeTruthy();
    expect(decklistValue().split('\n')).toContain('Sideboard');
    expect(screen.queryByText('Da riconoscere: vai a capo o esci dal campo')).toBeNull();
    expect(summary().queryByRole('button', { name: /da sistemare$/ })).toBeNull();
  });

  it('shows in the example a line split over several prints and a double-faced card', async () => {
    const user = userEvent.setup();
    mountApp('/proxy');

    await user.click(screen.getByRole('button', { name: 'Prova con un esempio' }));

    await waitFor(() =>
      expect(
        gridTiles()
          .map(tileSummary)
          .filter(([image]) => image === 'Immagine di Lightning Bolt'),
      ).toEqual([
        ['Immagine di Lightning Bolt', '2×', '1/3'],
        ['Immagine di Lightning Bolt', '1×', '2/3'],
        ['Immagine di Lightning Bolt', '1×', '3/3'],
      ]),
    );
    expect(
      screen.getByRole('button', { name: 'Una copia in meno di Lightning Bolt (M10 #1)' }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Gira Delver of Secrets' })).toBeTruthy();
  });

  it('lets the user choose the language of the cards before writing the decklist', async () => {
    const user = userEvent.setup();
    mountApp('/proxy');

    await user.click(
      within(screen.getByRole('group', { name: 'Lingua delle carte' })).getByRole('radio', {
        name: 'Italiano',
      }),
    );
    await user.type(screen.getByLabelText('Decklist'), '1 Counterspell{Enter}');

    const image = await screen.findByRole('img', { name: 'Immagine di Counterspell' });
    expect(image.getAttribute('src')).toContain('counterspell-it-mh2');
  });

  describe('on a phone', () => {
    beforeEach(() => {
      stubScreen(PHONE);
      return () => vi.unstubAllGlobals();
    });

    it('lets the user choose the language of the cards before writing the decklist on a phone', async () => {
      const user = userEvent.setup();
      mountApp('/proxy');

      await user.click(
        within(screen.getByRole('group', { name: 'Lingua delle carte' })).getByRole('radio', {
          name: 'Italiano',
        }),
      );
      await user.type(screen.getByLabelText('Decklist'), '1 Counterspell{Enter}');
      await screen.findByRole('region', { name: 'Riepilogo' });
      await user.click(stepBar().getByRole('button', { name: 'Carte' }));

      const image = await screen.findByRole('img', { name: 'Immagine di Counterspell' });
      expect(image.getAttribute('src')).toContain('counterspell-it-mh2');
    });

    it('shows the explanation, the decklist text and the example button, the other steps waiting for a card', async () => {
      const user = await mountPageAndWrite('4 Sol Ring');

      expect(screen.getByText(/^Incolla o scrivi una decklist, una carta per riga/)).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Prova con un esempio' })).toBeTruthy();
      expect(screen.queryByRole('region', { name: 'Riepilogo' })).toBeNull();
      for (const step of ['Carte', 'Foglio', 'PDF']) {
        expect(stepBar().getByRole<HTMLButtonElement>('button', { name: step }).disabled).toBe(
          true,
        );
      }

      await user.keyboard('{Enter}');

      expect(await screen.findByRole('region', { name: 'Riepilogo' })).toBeTruthy();
      expect(stepBar().getByRole<HTMLButtonElement>('button', { name: 'Carte' }).disabled).toBe(
        false,
      );
      await user.keyboard('1 Brainstorm');
      expect(decklistValue()).toBe('4 Sol Ring\n1 Brainstorm');
    });

    it('comes back on the list step when the last card goes from another step', async () => {
      const user = await mountPageAndWrite('1 Sol Ring{Enter}');
      await user.click(stepBar().getByRole('button', { name: 'Carte' }));

      await user.click(
        screen.getByRole('button', { name: 'Una copia in meno di Sol Ring (C21 #1)' }),
      );

      expect(screen.getByRole('button', { name: 'Prova con un esempio' })).toBeTruthy();
      expect(stepBar().getByRole('button', { name: 'Lista' }).getAttribute('aria-current')).toBe(
        'step',
      );
    });
  });
});

describe('the add tile', () => {
  /** Opens the search of the add tile ending `section`, and types `name` into it. */
  async function searchToAdd(
    user: ReturnType<typeof userEvent.setup>,
    section: string,
    name: string,
  ) {
    await user.click(
      await screen.findByRole('button', { name: `Aggiungi una carta a ${section}` }),
    );
    await user.type(screen.getByRole('combobox', { name: 'Nome della carta' }), name);
    return screen.findByRole('listbox', { name: 'Carte trovate' });
  }

  it('ends each section of the grid', async () => {
    await mountPageAndWrite('4 Sol Ring{Enter}{Enter}Sideboard{Enter}1 Pyroblast{Enter}');
    await screen.findByRole('button', { name: 'Modifica Pyroblast' });

    const sections = within(cardGrid()).getAllByRole('region');
    expect(
      sections.map((section) => within(section).getAllByRole('listitem').at(-1)?.textContent),
    ).toEqual(['Aggiungi una carta', 'Aggiungi una carta']);
  });

  it('stands for each section the decklist has no card in, after the others, under no title', async () => {
    await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });

    const emptySections = within(cardGrid()).getByRole('group', { name: 'Sezioni vuote' });
    expect(
      within(emptySections)
        .getAllByRole('button')
        .map((tile) => tile.textContent),
    ).toEqual([
      'Aggiungi a Comandante',
      'Aggiungi a Terre',
      'Aggiungi a Sideboard',
      'Aggiungi a Token',
    ]);
    expect(gridSections()).toEqual([['Mazzo 4 carte', ['Immagine di Sol Ring']]]);
  });

  it('opens an empty section with its header in the text, and its title in the grid', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    const found = await searchToAdd(user, 'Sideboard', 'pyrobl');

    await user.click(await within(found).findByRole('option', { name: /Pyroblast/ }));

    expect(decklistValue()).toBe('4 Sol Ring\n\nSideboard\n1 Pyroblast');
    expect(gridSections()).toEqual([
      ['Mazzo 4 carte', ['Immagine di Sol Ring']],
      ['Sideboard 1 carta', ['Immagine di Pyroblast']],
    ]);
  });

  it('searches once the user stops typing, showing each card found with its image', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');

    const found = await searchToAdd(user, 'Mazzo', 'lightn');

    expect(await within(found).findByRole('option', { name: /Lightning Bolt/ })).toBeTruthy();
    expect(within(found).getByRole('option', { name: /Lightning Helix/ })).toBeTruthy();
    expect(within(found).getByRole('img', { name: 'Immagine di Lightning Bolt' })).toBeTruthy();
    expect(vi.mocked(api.searchCardsByName)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(api.searchCardsByName)).toHaveBeenCalledWith('lightn', 'it');
  });

  it('forgives a misspelled name, as the decklist does', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');

    const found = await searchToAdd(user, 'Mazzo', 'brainstrom');

    expect(await within(found).findByRole('option', { name: /Brainstorm/ })).toBeTruthy();
  });

  it('says so when no card comes close', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Aggiungi una carta a Mazzo' }));

    await user.type(screen.getByRole('combobox', { name: 'Nome della carta' }), 'xyzzy plover');

    expect(await screen.findByText('Nessuna carta trovata')).toBeTruthy();
  });

  it('adds the picked card at the end of its section, as a tile and as a line of the text', async () => {
    const user = await mountPageAndWrite(
      '4 Sol Ring{Enter}{Enter}Sideboard{Enter}1 Pyroblast{Enter}',
    );
    const found = await searchToAdd(user, 'Mazzo', 'brainst');

    await user.click(await within(found).findByRole('option', { name: /Brainstorm/ }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Modifica Brainstorm' })).toBeTruthy();
    expect(decklistValue()).toBe('4 Sol Ring\n1 Brainstorm\n\nSideboard\n1 Pyroblast\n');
  });

  it('adds a copy to the line of a card the section already has', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    const found = await searchToAdd(user, 'Mazzo', 'sol ring');

    await user.click(await within(found).findByRole('option', { name: /Sol Ring/ }));

    expect(decklistValue()).toBe('5 Sol Ring\n');
  });

  it('adds a copy to a line of the card the server has not resolved yet', async () => {
    vi.mocked(api.resolveDecklistText).mockImplementation(() => new Promise(() => {}));
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    const found = await searchToAdd(user, 'Mazzo', 'sol ring');

    await user.click(await within(found).findByRole('option', { name: /Sol Ring/ }));

    expect(decklistValue()).toBe('5 Sol Ring\n');
  });

  it('adds a copy to an ambiguous line written with the name of the card, picking that card', async () => {
    const otherIsland = catalogEntry('island-other', 'Island', 'oth');
    Object.entries(inMemoryServer([...CATALOG, otherIsland])).forEach(([call, answer]) => {
      vi.mocked(api[call as keyof typeof api]).mockImplementation(answer as never);
    });
    const user = await mountPageAndWrite('1 Island{Enter}');
    expect(await screen.findByText('Quale carta intendevi?')).toBeTruthy();
    const found = await searchToAdd(user, 'Mazzo', 'island');

    const [firstIsland] = await within(found).findAllByRole('option', { name: /Island/ });
    if (!firstIsland) throw new Error('no Island found');
    await user.click(firstIsland);

    expect(decklistValue()).toBe('2 Island\n');
    expect(screen.getByRole('button', { name: 'Modifica Island' })).toBeTruthy();
    expect(screen.queryByText('Quale carta intendevi?')).toBeNull();
  });

  it('is used from the keyboard: the arrows go through the cards found, Enter adds one', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    const found = await searchToAdd(user, 'Mazzo', 'lightn');
    await within(found).findByRole('option', { name: /Lightning Helix/ });

    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowUp}{ArrowDown}{Enter}');

    expect(decklistValue()).toBe('4 Sol Ring\n1 Lightning Helix\n');
  });

  it('closes with Escape, adding nothing', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    const found = await searchToAdd(user, 'Mazzo', 'lightn');
    await within(found).findByRole('option', { name: /Lightning Bolt/ });

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(decklistValue()).toBe('4 Sol Ring\n');
  });

  it('starts the decklist from the empty workspace', async () => {
    const user = userEvent.setup();
    mountApp('/proxy');
    const found = await searchToAdd(user, 'Mazzo', 'sol ri');

    await user.click(await within(found).findByRole('option', { name: /Sol Ring/ }));

    expect(await screen.findByRole('button', { name: 'Modifica Sol Ring' })).toBeTruthy();
    expect(decklistValue()).toBe('1 Sol Ring');
  });
});

describe('the decklist saved on the device', () => {
  /** Leaves the page and opens it again, as a reload does. */
  function reload() {
    cleanup();
    mountApp('/proxy');
  }

  it('comes back after a reload, every line recognised again', async () => {
    await mountPageAndWrite('4 Sol Ring{Enter}1 Lightning Bolt');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });
    vi.mocked(api.resolveDecklistText).mockClear();

    reload();

    expect(decklistValue()).toBe('4 Sol Ring\n1 Lightning Bolt');
    expect(await screen.findByRole('button', { name: 'Modifica Lightning Bolt' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Modifica Sol Ring' })).toBeTruthy();
    expect(api.resolveDecklistText).toHaveBeenCalledWith('4 Sol Ring\n1 Lightning Bolt', 'it');
  });

  it("brings back each line's choices: the candidate picked and the copies on prints of either language", async () => {
    const user = await mountPageAndWrite('1 Lightning{Enter}4 Brainstorm{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Lightning Bolt' }));
    await user.click(screen.getByRole('button', { name: 'Modifica Brainstorm' }));
    await user.click(await screen.findByRole('button', { name: 'Una copia in più con MMQ #1' }));
    await user.click(screen.getByRole('radio', { name: 'Inglese' }));
    await user.click(await screen.findByRole('button', { name: 'Una copia in più con C21 #1' }));

    reload();

    await waitFor(() =>
      expect(gridTiles().map(tileSummary)).toEqual([
        ['Immagine di Lightning Bolt', '1×', undefined],
        ['Immagine di Brainstorm', '2×', '1/3'],
        ['Immagine di Brainstorm', '1×', '2/3'],
        ['Immagine di Brainstorm', '1×', '3/3'],
      ]),
    );
    const images = screen.getAllByRole('img', { name: 'Immagine di Brainstorm' });
    expect(
      images.map((image) => /brainstorm-[\w-]+/.exec(image.getAttribute('src') ?? '')?.[0]),
    ).toEqual(['brainstorm-it-ice', 'brainstorm-it-mmq', 'brainstorm-c21']);
  });

  it('brings back the sheet options', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });
    await user.click(screen.getByRole('button', { name: 'Foglio' }));
    await user.selectOptions(screen.getByLabelText('Formato della pagina'), 'Letter (USA)');
    await user.selectOptions(
      screen.getByLabelText('Qualità delle immagini'),
      'Qualità massima (PNG)',
    );
    await user.click(screen.getByLabelText('Segni di taglio'));
    fireEvent.change(screen.getByLabelText('Margine dal bordo del foglio (mm)'), {
      target: { value: '8' },
    });
    fireEvent.change(screen.getByLabelText('Spazio tra le carte (mm)'), { target: { value: '2' } });

    reload();
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });
    await user.click(screen.getByRole('button', { name: 'Foglio' }));

    const field = (label: string) => screen.getByLabelText<HTMLInputElement>(label);
    expect(field('Formato della pagina').value).toBe('Letter');
    expect(field('Qualità delle immagini').value).toBe('png');
    expect(field('Segni di taglio').checked).toBe(false);
    expect(field('Margine dal bordo del foglio (mm)').value).toBe('8');
    expect(field('Spazio tra le carte (mm)').value).toBe('2');
  });

  it.each([
    ['not readable', '{"version": 1, "decklistText": '],
    [
      'of an unknown version',
      JSON.stringify({
        version: 99,
        decklistText: '4 Sol Ring',
        choicesByLine: [],
        sheetOptions: defaultSheetOptions,
      }),
    ],
    ['of the wrong shape', JSON.stringify({ version: 1, decklistText: ['4 Sol Ring'] })],
  ])('starts empty, with no error, from saved data %s', (_kind, stored) => {
    localStorage.setItem('mtg-suite.decklist', stored);

    mountApp('/proxy');

    expect(decklistValue()).toBe('');
    expect(screen.getByRole('button', { name: 'Prova con un esempio' })).toBeTruthy();
  });

  it('works for the visit, keeping nothing, when the device keeps nothing', async () => {
    const blocked = () => {
      throw new Error('SecurityError');
    };
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(blocked);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(blocked);

    await mountPageAndWrite('4 Sol Ring{Enter}');

    expect(await screen.findByRole('button', { name: 'Modifica Sol Ring' })).toBeTruthy();
    vi.restoreAllMocks();
    reload();
    expect(decklistValue()).toBe('');
  });
});

describe('a new decklist', () => {
  it('empties the workspace once the user confirms, and stays empty after a reload', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });
    await user.click(screen.getByRole('button', { name: 'Foglio' }));
    await user.selectOptions(screen.getByLabelText('Formato della pagina'), 'Letter (USA)');

    await user.click(screen.getByRole('button', { name: 'Nuova decklist' }));
    await user.click(
      within(screen.getByRole('dialog', { name: 'Iniziare una nuova decklist?' })).getByRole(
        'button',
        { name: 'Svuota' },
      ),
    );

    expect(decklistValue()).toBe('');
    expect(screen.getByRole('button', { name: 'Prova con un esempio' })).toBeTruthy();
    cleanup();
    mountApp('/proxy');
    expect(decklistValue()).toBe('');
    expect(screen.getByRole('button', { name: 'Prova con un esempio' })).toBeTruthy();
    await user.type(screen.getByLabelText('Decklist'), '4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });
    await user.click(screen.getByRole('button', { name: 'Foglio' }));
    expect(screen.getByLabelText<HTMLSelectElement>('Formato della pagina').value).toBe('A4');
  });

  /** Starts a new decklist, confirming it. */
  async function startNewDecklist(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: 'Nuova decklist' }));
    await user.click(screen.getByRole('button', { name: 'Svuota' }));
  }

  it('leaves no error of the emptied decklist behind', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });
    vi.mocked(api.resolveDecklistText).mockRejectedValue(new Error('offline'));
    await user.type(screen.getByLabelText('Decklist'), '1 Brainstorm{Enter}');
    await screen.findByRole('alert');

    await startNewDecklist(user);

    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('opens empty after a reload, with no error even while the server is out of reach', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });
    await startNewDecklist(user);
    vi.mocked(api.resolveDecklistText).mockRejectedValue(new Error('offline'));

    cleanup();
    mountApp('/proxy');

    expect(decklistValue()).toBe('');
    await act(() => Promise.resolve());
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('keeps the decklist when the user changes their mind', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });

    await user.click(screen.getByRole('button', { name: 'Nuova decklist' }));
    await user.click(screen.getByRole('button', { name: 'Annulla' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(decklistValue()).toBe('4 Sol Ring\n');
    expect(screen.getByRole('button', { name: 'Modifica Sol Ring' })).toBeTruthy();
  });

  it('is not offered while there is nothing to empty', () => {
    mountApp('/proxy');

    expect(screen.queryByRole('button', { name: 'Nuova decklist' })).toBeNull();
  });
});
