import { jpegOfSize } from '@leyline/core/test-fixtures';
import { act, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../api.ts';
import { DESKTOP, PHONE, stubScreen } from '../test-support/test-screen.ts';
import { animateRadixParts, endExitAnimationsWithin } from '../test-support/exit-animations.ts';
import {
  mountPageAndWrite,
  pickCandidate,
  moveOneCopy,
  stepBar,
  answerApiCallsFromCatalog,
} from '../test-support/workspace-page.ts';
import {
  centreTab,
  cardGrid,
  gridTiles,
  gridSections,
  tileAt,
  tileSummary,
  siblingColourOf,
  ringColoursOf,
} from '../test-support/grid-queries.ts';

vi.mock('../api.ts');

beforeEach(answerApiCallsFromCatalog);

/** The text that describes `element` to a screen reader, through its `aria-describedby`. */
function descriptionOf(element: HTMLElement) {
  const ids = element.getAttribute('aria-describedby')?.split(' ') ?? [];
  return ids.map((id) => document.getElementById(id)?.textContent).join(' ');
}

/** The colours of the rings around a tile's card, from the card outward. */
function cardRingColoursOf(tile: HTMLElement) {
  return ringColoursOf(within(tile).getByRole('button', { name: /^Modifica / }));
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

    await moveOneCopy(user, 'Sol Ring', 'C21 #1', 'LEA #1');

    expect(gridTiles().map(tileSummary)).toEqual([
      ['Immagine di Sol Ring', '3×', '1/2'],
      ['Immagine di Sol Ring', '1×', '2/2'],
      ['Immagine di Lightning Bolt', '1×', undefined],
    ]);
  });

  it('gives two groups of sibling tiles one above the other different colours, and a tile without siblings none', async () => {
    // jsdom lays nothing out, so the grid counts one column: each tile stands under the one before.
    const user = await mountPageAndWrite('4 Sol Ring{Enter}4 Lightning Bolt{Enter}1 Island{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Modifica Sol Ring' }));
    await user.click(await screen.findByRole('button', { name: 'Una copia in più con LEA #1' }));
    await user.click(screen.getByRole('button', { name: 'Modifica Lightning Bolt' }));
    await user.click(await screen.findByRole('button', { name: 'Una copia in più con M10 #1' }));

    const [solRing, otherSolRing, bolt, otherBolt, island] = gridTiles().map(siblingColourOf);

    expect(solRing).toBeTruthy();
    expect(otherSolRing).toBe(solRing);
    expect(bolt).toBeTruthy();
    expect(otherBolt).toBe(bolt);
    expect(bolt).not.toBe(solRing);
    expect(island).toBeUndefined();
  });

  it('rings a selected sibling tile in its group colour inside the selection, edged so the board shows it', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Modifica Sol Ring' }));
    await user.click(await screen.findByRole('button', { name: 'Una copia in più con LEA #1' }));

    const [selected, sibling] = gridTiles().map(cardRingColoursOf);

    expect(selected).toEqual([
      'var(--sibling-colour)',
      'var(--color-accent)',
      'var(--color-selection-edge)',
    ]);
    expect(sibling).toEqual(['var(--sibling-colour)']);
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

  it('picks the view of the centre from its tabs, «Carte» and «Foglio», the arrows moving between them', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });
    expect(centreTab('Carte').getAttribute('aria-selected')).toBe('true');

    centreTab('Carte').focus();
    await user.keyboard('{ArrowRight}');

    expect(centreTab('Foglio').getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tabpanel', { name: 'Foglio' })).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Griglia delle carte' })).toBeNull();

    await user.keyboard('{ArrowLeft}');

    expect(centreTab('Carte').getAttribute('aria-selected')).toBe('true');
    expect(cardGrid()).toBeTruthy();
  });

  it('switches to the sheet view, with the page, the 100% reminder and the sheet options', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}2 Nonexistent Card{Enter}');
    await screen.findByText('Carta non trovata');

    await user.click(centreTab('Foglio'));

    expect(screen.getByRole('img', { name: 'Pagina 1 di 1 come verrà stampata' })).toBeTruthy();
    expect(screen.getAllByRole('note')[0]?.textContent).toContain('Stampa al 100%');
    expect(screen.getByText(/^1 riga non verrà stampata/)).toBeTruthy();
    const inspector = within(screen.getByRole('complementary', { name: 'Opzioni del foglio' }));
    expect(inspector.getByLabelText('Formato della pagina')).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Griglia delle carte' })).toBeNull();
  });

  it('notes in the sheet view, after the 100% reminder, that the printed cards are proxies for private playtesting only', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });

    await user.click(centreTab('Foglio'));

    const [printAtActualSize, proxyUse] = screen.getAllByRole('note');
    expect(printAtActualSize?.textContent).toContain('Stampa al 100%');
    expect(proxyUse?.textContent).toBe(
      'Le carte stampate sono proxy solo per il playtest privato: non sono ammesse nei tornei sanzionati e non vanno mai spacciate per carte vere né vendute.',
    );
  });

  it('offers the PDF in the sheet view only, the cards view leading there from «Controlla il foglio →»', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });
    expect(screen.queryByRole('button', { name: 'Scarica il PDF' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Controlla il foglio →' }));

    expect(centreTab('Foglio').getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('button', { name: 'Scarica il PDF' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Controlla il foglio →' })).toBeNull();
  });

  it.each([
    ['an empty decklist', ''],
    ['only lines it could not recognise', '2 Nonexistent Card{Enter}'],
  ])(
    'keeps «Controlla il foglio →» disabled with %s, saying why beside it, the «Foglio» tab still open',
    async (_kind, decklistText) => {
      const user = await mountPageAndWrite('4 Sol Ring{Enter}');
      await screen.findByRole('button', { name: 'Modifica Sol Ring' });
      await user.clear(screen.getByLabelText('Decklist'));
      if (decklistText) await user.type(screen.getByLabelText('Decklist'), decklistText);
      await waitFor(() => expect(gridTiles()).toHaveLength(decklistText ? 1 : 0));

      const toSheet = screen.getByRole<HTMLButtonElement>('button', {
        name: 'Controlla il foglio →',
      });
      expect(toSheet.disabled).toBe(true);
      expect(descriptionOf(toSheet)).toBe(
        'Aggiungi almeno una carta riconosciuta per vedere il foglio',
      );
      await user.click(centreTab('Foglio'));
      expect(centreTab('Foglio').getAttribute('aria-selected')).toBe('true');
    },
  );

  it('opens «Controlla il foglio →» once one card is recognised, a line to fix left beside it', async () => {
    await mountPageAndWrite('1 Lightning{Enter}4 Sol Ring{Enter}');
    await screen.findByText('Quale carta intendevi?');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });

    const toSheet = screen.getByRole<HTMLButtonElement>('button', {
      name: 'Controlla il foglio →',
    });
    expect(toSheet.disabled).toBe(false);
    expect(descriptionOf(toSheet)).toBe('');
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

  it('lets go of the selected tile on a click on the empty space of the grid, back to the summary', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Modifica Sol Ring' }));
    expect(screen.getByRole('complementary', { name: 'Riga selezionata' })).toBeTruthy();

    await user.click(cardGrid());

    expect(screen.getByRole('complementary', { name: 'Riepilogo' })).toBeTruthy();
    const tileButton = screen.getByRole('button', { name: 'Modifica Sol Ring' });
    expect(tileButton.getAttribute('aria-pressed')).toBe('false');
  });

  it('moves the selection to another tile clicked while one is selected', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}1 Lightning Bolt{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Modifica Sol Ring' }));

    await user.click(screen.getByRole('button', { name: 'Modifica Lightning Bolt' }));

    const solRing = screen.getByRole('button', { name: 'Modifica Sol Ring' });
    const bolt = screen.getByRole('button', { name: 'Modifica Lightning Bolt' });
    expect(solRing.getAttribute('aria-pressed')).toBe('false');
    expect(bolt.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('complementary', { name: 'Riga selezionata' })).toBeTruthy();
  });

  it("keeps the selection through a tile's plus and minus", async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Modifica Sol Ring' }));

    await user.click(tileAt(0).getByRole('button', { name: /^Una copia in più/ }));
    await user.click(tileAt(0).getByRole('button', { name: /^Una copia in meno/ }));

    const tileButton = screen.getByRole('button', { name: 'Modifica Sol Ring' });
    expect(tileButton.getAttribute('aria-pressed')).toBe('true');
  });

  it('keeps the selection on a click in the inspector, the decklist text or the toolbar', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Modifica Sol Ring' }));

    await user.click(screen.getByRole('complementary', { name: 'Riga selezionata' }));
    await user.click(screen.getByLabelText('Decklist'));
    await user.click(screen.getByRole('slider'));

    expect(screen.getByRole('complementary', { name: 'Riga selezionata' })).toBeTruthy();
  });

  it('keeps the selection on its line when every copy leaves the selected print', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Modifica Sol Ring' }));

    for (let copy = 0; copy < 4; copy += 1) {
      await moveOneCopy(user, 'Sol Ring', 'C21 #1', 'LEA #1');
    }

    const [onlyTile] = gridTiles();
    expect(onlyTile && tileSummary(onlyTile)).toEqual(['Immagine di Sol Ring', '4×', undefined]);
    const tileButton = screen.getByRole('button', { name: 'Modifica Sol Ring' });
    expect(tileButton.getAttribute('aria-pressed')).toBe('true');
  });
});

describe('the workspace on a phone', () => {
  beforeEach(() => {
    stubScreen(PHONE);
    return () => vi.unstubAllGlobals();
  });

  it('shows one step at a time on the whole screen, picked from the bottom bar', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    expect(screen.queryByRole('region', { name: 'Griglia delle carte' })).toBeNull();
    expect(
      stepBar()
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['Lista', 'Carte', 'Foglio']);

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
    await pickCandidate(user, 'Lightning Bolt');

    expect(topBar.getByText('12 carte · 2 pagine')).toBeTruthy();
  });

  it('breaks the top bar count only between the cards and the pages, on a narrow screen', async () => {
    await mountPageAndWrite('4 Sol Ring{Enter}');
    const count = await within(screen.getByRole('banner')).findByText('4 carte · 1 pagina');

    expect(count.textContent).toBe('4\u00a0carte · 1\u00a0pagina');
  });

  it("raises the tapped tile's line panel from the bottom, with the inspector's settings", async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await user.click(stepBar().getByRole('button', { name: 'Carte' }));

    await user.click(screen.getByRole('button', { name: 'Modifica Sol Ring' }));

    const panel = within(screen.getByRole('dialog', { name: 'Riga selezionata' }));
    expect(panel.getByRole('group', { name: 'Copie' })).toBeTruthy();
    expect(await panel.findByRole('region', { name: 'Stampe di Sol Ring' })).toBeTruthy();
    await user.click(panel.getByRole('button', { name: 'Una copia in più' }));
    await user.click(panel.getByRole('button', { name: 'Chiudi' }));

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

  it("keeps a folding panel's content in sight until it has slid up under the title", async () => {
    animateRadixParts();
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    const panel = screen.getByRole('region', { name: 'Lista' });

    await user.click(screen.getByRole('button', { name: 'Richiudi il pannello «Lista»' }));

    expect(screen.getByRole('textbox', { name: 'Decklist' })).toBeTruthy();
    act(() => endExitAnimationsWithin(panel));
    expect(screen.queryByRole('textbox', { name: 'Decklist' })).toBeNull();
  });

  it('makes the PDF from the "Foglio" step and hands it to the share menu of a phone that can', async () => {
    const share = vi.fn(async () => {});
    vi.stubGlobal('navigator', { ...navigator, canShare: () => true, share });
    vi.mocked(api.fetchImages).mockImplementation(
      async (urls) => new Map(urls.map((url) => [url, jpegOfSize(488, 680)])),
    );
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');

    await user.click(stepBar().getByRole('button', { name: 'Foglio' }));

    expect(screen.getAllByRole('note')[0]?.textContent).toContain('Stampa al 100%');
    expect(screen.getByRole('img', { name: 'Pagina 1 di 1 come verrà stampata' })).toBeTruthy();
    expect(screen.queryByLabelText('Decklist')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Crea il PDF' }));
    await user.click(await screen.findByRole('button', { name: 'Salva o condividi' }));

    expect(share).toHaveBeenCalledWith({
      files: [expect.objectContaining({ name: 'proxy-leyline.pdf', type: 'application/pdf' })],
    });
  });

  it('goes to the "Carte" step from the counter of lines to fix, the first one open in its panel', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}2 Nonexistent Card{Enter}');
    await screen.findByRole('button', { name: '1 riga da sistemare' });

    await user.click(screen.getByRole('button', { name: '1 riga da sistemare' }));

    const panel = within(screen.getByRole('dialog', { name: 'Riga da sistemare' }));
    expect(panel.getByText('2 Nonexistent Card')).toBeTruthy();
    await user.click(panel.getByRole('button', { name: 'Chiudi' }));

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

describe('the workspace across screen sizes', () => {
  it('keeps the text and the selected tile when a wide screen narrows to a phone, open in its line panel', async () => {
    const screenSize = stubScreen(DESKTOP);
    const user = await mountPageAndWrite('4 Sol Ring{Enter}1 Lightning Bolt{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Modifica Lightning Bolt' }));

    act(() => screenSize.resize(false));

    const panel = within(screen.getByRole('dialog', { name: 'Riga selezionata' }));
    expect(panel.getByRole('heading', { name: 'Lightning Bolt' })).toBeTruthy();
    await user.click(panel.getByRole('button', { name: 'Chiudi' }));
    await user.click(stepBar().getByRole('button', { name: 'Lista' }));
    expect(screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Decklist' }).value).toBe(
      '4 Sol Ring\n1 Lightning Bolt\n',
    );
  });
});
