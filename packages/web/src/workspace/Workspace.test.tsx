import type { CatalogEntry } from '@mtg-suite/core';
import { aCard, aPrint, jpegOfSize } from '@mtg-suite/core/test-fixtures';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../api.ts';
import { inMemoryServer } from '../in-memory-server.ts';
import { mountApp } from '../mount-app.tsx';
import { DESKTOP, PHONE, stubScreen } from '../test-screen.ts';

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

const CATALOG = [
  catalogEntry('sol-ring', 'Sol Ring', 'c21', 'lea'),
  catalogEntry('lightning-bolt', 'Lightning Bolt'),
  catalogEntry('lightning-helix', 'Lightning Helix'),
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
    const user = await mountPageAndWrite('4 Sol Ring');
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

/** The tiles of the card grid, in the order the grid shows them. */
function gridTiles() {
  return within(screen.getByRole('list', { name: 'Griglia delle carte' })).getAllByRole('listitem');
}

/** What a tile shows: its image, its quantity and, among siblings, which of them it is. */
function tileSummary(tile: HTMLElement) {
  return [
    within(tile).queryByRole('img')?.getAttribute('alt'),
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

  it("shows the selected tile's language, quantity and prints in the inspector, beside the grid", async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');

    await user.click(await screen.findByRole('button', { name: 'Modifica Sol Ring' }));

    const inspector = within(screen.getByRole('complementary', { name: 'Riga selezionata' }));
    expect(inspector.getByRole('group', { name: 'Lingua di questa carta' })).toBeTruthy();
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
    expect(screen.queryByRole('list', { name: 'Griglia delle carte' })).toBeNull();
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
    expect(screen.queryByRole('list', { name: 'Griglia delle carte' })).toBeNull();

    await user.click(stepBar().getByRole('button', { name: 'Carte' }));

    expect(await screen.findByRole('button', { name: 'Modifica Sol Ring' })).toBeTruthy();
    expect(screen.queryByLabelText('Decklist')).toBeNull();

    await user.click(stepBar().getByRole('button', { name: 'Foglio' }));

    expect(screen.getByRole('img', { name: 'Pagina 1 di 1 come verrà stampata' })).toBeTruthy();
    expect(screen.getByLabelText('Formato della pagina')).toBeTruthy();
    expect(screen.queryByRole('list', { name: 'Griglia delle carte' })).toBeNull();

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
    expect(panel.getByRole('group', { name: 'Lingua di questa carta' })).toBeTruthy();
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

  it('keeps the place of a banner under the top bar in the "Lista" step only', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    expect(document.querySelectorAll('[data-ad-slot]')).toHaveLength(1);

    await user.click(stepBar().getByRole('button', { name: 'Carte' }));

    expect(document.querySelectorAll('[data-ad-slot]')).toHaveLength(0);
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
