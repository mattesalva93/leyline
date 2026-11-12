import type { CatalogEntry } from '@mtg-suite/core';
import { aCard, aPrint } from '@mtg-suite/core/test-fixtures';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../api.ts';
import { inMemoryServer } from '../in-memory-server.ts';
import { mountApp } from '../mount-app.tsx';

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
      ['Immagine di Sol Ring', '1×', '1/2'],
      ['Immagine di Sol Ring', '3×', '2/2'],
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
});
