import { MAX_PRINT_QUERY_LENGTH } from '@leyline/core';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../../api.ts';
import { inMemoryServer } from '../../test-support/in-memory-server.ts';
import { PHONE, stubScreen } from '../../test-support/test-screen.ts';
import { SEARCH_TYPING_WAIT_MS } from '../search-typing-wait.ts';
import {
  CATALOG,
  mountPageAndWrite,
  moveOneCopy,
  summary,
  stepBar,
  answerApiCallsFromCatalog,
} from '../../test-support/workspace-page.ts';
import { gridTiles, tileAt, tileSummary, printButtonOf } from '../../test-support/grid-queries.ts';

vi.mock('../../api.ts');

beforeEach(answerApiCallsFromCatalog);

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
    await moveOneCopy(user, 'Brainstorm', 'ICE #1', 'MMQ #1');

    await user.click(await printsLanguage().findByRole('radio', { name: 'Inglese (1)' }));
    await moveOneCopy(user, 'Brainstorm', 'ICE #1', 'C21 #1');

    expect(screen.queryByRole('button', { name: 'Una copia in più con MMQ #1' })).toBeNull();
    expect(gridTiles().map(tileSummary)).toEqual([
      ['Immagine di Brainstorm', '2×', '1/3'],
      ['Immagine di Brainstorm', '1×', '2/3'],
      ['Immagine di Brainstorm', '1×', '3/3'],
    ]);
    expect(screen.queryByRole('img', { name: 'Stampa in inglese' })).toBeNull();
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
    await moveOneCopy(user, 'Brainstorm', 'ICE #1', 'MMQ #1');
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

describe('the languages of the print picker', () => {
  /** The language choice of the print picker in the inspector. */
  async function printsLanguage() {
    const inspector = within(screen.getByRole('complementary', { name: 'Riga selezionata' }));
    return within(await inspector.findByRole('group', { name: 'Lingua delle stampe' }));
  }

  it('counts the prints of each language, the one not selected too, without loading its pages', async () => {
    const user = await mountPageAndWrite('4 Brainstorm{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Modifica Brainstorm' }));

    const languages = await printsLanguage();

    expect(
      await languages.findByRole('radio', { name: 'Italiano (2)', checked: true }),
    ).toBeTruthy();
    expect(languages.getByRole('radio', { name: 'Inglese (1)' })).toBeTruthy();
    expect(vi.mocked(api.fetchPrintPage).mock.calls.map(([, lang]) => lang)).not.toContain('en');
  });

  it('offers no Italian prints for a card whose only Italian one is not printable, and opens on English', async () => {
    const user = await mountPageAndWrite('1 Trinisphere{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Modifica Trinisphere' }));

    const languages = await printsLanguage();

    const italian = await languages.findByRole('radio', { name: 'Italiano (0)' });
    expect(italian).toHaveProperty('disabled', true);
    expect(languages.getByRole('radio', { name: 'Inglese (2)', checked: true })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Una copia in più con SLD #1' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Stampa in inglese' })).toBeTruthy();
  });
});

describe("the print picker opened on the tile's print", () => {
  /** Makes the server send one print per page, as for a card with many prints. */
  function onePrintPerPage() {
    const server = inMemoryServer(CATALOG);
    vi.mocked(api.fetchPrintPage).mockImplementation((oracleId, lang, _limit, cursor, printQuery) =>
      server.fetchPrintPage(oracleId, lang, 1, cursor, printQuery),
    );
  }

  /**
   * Gives `4 Brainstorm` a tile on each of its prints: ICE (Italian, the default), MMQ (Italian,
   * second in its list) and C21 (English), in that order in the grid.
   */
  async function splitBrainstorm(
    user: ReturnType<typeof userEvent.setup>,
    panel: () => HTMLElement,
  ) {
    await user.click(
      await within(panel()).findByRole('button', { name: 'Una copia in più con MMQ #1' }),
    );
    await user.click(await within(panel()).findByRole('radio', { name: 'Inglese (1)' }));
    await user.click(
      await within(panel()).findByRole('button', { name: 'Una copia in più con C21 #1' }),
    );
  }

  const inspector = () => screen.getByRole('complementary', { name: 'Riga selezionata' });

  it("shows the prints in the tile's language, its own in view with the focus, loading the pages before it", async () => {
    const user = await mountPageAndWrite('4 Brainstorm{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Modifica Brainstorm' }));
    await splitBrainstorm(user, inspector);
    await user.click(screen.getByRole('button', { name: 'Modifica Brainstorm', pressed: true }));
    onePrintPerPage();

    await user.click(tileAt(1).getByRole('button', { name: 'Modifica Brainstorm' }));

    await waitFor(() => expect(document.activeElement).toBe(printButtonOf('MMQ #1')));
    expect(
      within(inspector()).getByRole('radio', { name: 'Italiano (2)', checked: true }),
    ).toBeTruthy();
  });

  it('follows a sibling tile to its print and its language', async () => {
    const user = await mountPageAndWrite('4 Brainstorm{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Modifica Brainstorm' }));
    await splitBrainstorm(user, inspector);
    await user.click(tileAt(1).getByRole('button', { name: 'Modifica Brainstorm' }));
    await waitFor(() => expect(document.activeElement).toBe(printButtonOf('MMQ #1')));

    await user.click(tileAt(2).getByRole('button', { name: 'Modifica Brainstorm' }));

    await waitFor(() => expect(document.activeElement).toBe(printButtonOf('C21 #1')));
    expect(
      within(inspector()).getByRole('radio', { name: 'Inglese (1)', checked: true }),
    ).toBeTruthy();
  });

  it("keeps the picker's language when a minus empties the selected tile's print and the selection moves on", async () => {
    const user = await mountPageAndWrite('4 Brainstorm{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Modifica Brainstorm' }));
    await user.click(await within(inspector()).findByRole('radio', { name: 'Inglese (1)' }));
    await user.click(await screen.findByRole('button', { name: 'Una copia in più con C21 #1' }));
    await user.click(tileAt(1).getByRole('button', { name: 'Modifica Brainstorm' }));
    await waitFor(() => expect(document.activeElement).toBe(printButtonOf('C21 #1')));

    await user.click(screen.getByRole('button', { name: 'Una copia in meno con C21 #1' }));

    expect(gridTiles()).toHaveLength(1);
    expect(
      within(inspector()).getByRole('radio', { name: 'Inglese (1)', checked: true }),
    ).toBeTruthy();
  });

  it("opens on the tile's print on a phone too, in the panel risen from the bottom", async () => {
    stubScreen(PHONE);
    const user = await mountPageAndWrite('4 Brainstorm{Enter}');
    await user.click(stepBar().getByRole('button', { name: 'Carte' }));
    await user.click(await screen.findByRole('button', { name: 'Modifica Brainstorm' }));
    const phonePanel = () => screen.getByRole('dialog', { name: 'Riga selezionata' });
    await splitBrainstorm(user, phonePanel);
    await user.click(within(phonePanel()).getByRole('button', { name: 'Chiudi' }));
    onePrintPerPage();

    await user.click(tileAt(1).getByRole('button', { name: 'Modifica Brainstorm' }));

    await waitFor(() => expect(document.activeElement).toBe(printButtonOf('MMQ #1')));
    expect(
      within(phonePanel()).getByRole('radio', { name: 'Italiano (2)', checked: true }),
    ).toBeTruthy();
  });
});

describe('tapping a print in the print picker', () => {
  const SWORDS = 'Swords to Plowshares';

  /** The set and number a tile shows under its card. */
  function setAndNumberOf(tile: HTMLElement) {
    return within(tile).getByText(/^[A-Z0-9]+ #\d+$/).textContent;
  }

  /** Each tile of the grid as (set and number, quantity), sorted by set. */
  function tilesBySetAndNumber() {
    return gridTiles()
      .map((tile) => [setAndNumberOf(tile), within(tile).queryByText(/×$/)?.textContent])
      .sort(([a], [b]) => String(a).localeCompare(String(b)));
  }

  /** Presses the tile showing the print `setAndNumber`. */
  async function pressTileOf(user: ReturnType<typeof userEvent.setup>, setAndNumber: string) {
    const tile = gridTiles().find((each) => setAndNumberOf(each) === setAndNumber);
    if (!tile) throw new Error(`no tile of ${setAndNumber}`);
    await user.click(within(tile).getByRole('button', { name: `Modifica ${SWORDS}` }));
  }

  /** Taps the print `setAndNumber` in the print picker. */
  async function tapPrint(user: ReturnType<typeof userEvent.setup>, setAndNumber: string) {
    await screen.findByRole('group', { name: `Copie con ${setAndNumber}` });
    await user.click(printButtonOf(setAndNumber));
  }

  /** The set and number of the selected tile's print. */
  function selectedSetAndNumber() {
    const pressed = screen.getByRole('button', { name: `Modifica ${SWORDS}`, pressed: true });
    return setAndNumberOf(pressed.closest('li') ?? pressed);
  }

  /** Splits `4 Swords to Plowshares` 2 + 1 + 1: two ICE (the default), one MMQ, one C21. */
  async function splitTwoOneOne(user: ReturnType<typeof userEvent.setup>) {
    await moveOneCopy(user, SWORDS, 'ICE #1', 'MMQ #1');
    await moveOneCopy(user, SWORDS, 'ICE #1', 'C21 #1');
  }

  it('moves only the copies of the selected tile, which keeps the selection on its new print', async () => {
    const user = await mountPageAndWrite(`4 ${SWORDS}{Enter}`);
    await user.click(await screen.findByRole('button', { name: `Modifica ${SWORDS}` }));
    await splitTwoOneOne(user);
    await pressTileOf(user, 'MMQ #1');

    await tapPrint(user, 'STA #1');

    expect(tilesBySetAndNumber()).toEqual([
      ['C21 #1', '1×'],
      ['ICE #1', '2×'],
      ['STA #1', '1×'],
    ]);
    expect(selectedSetAndNumber()).toBe('STA #1');
  });

  it('moves only the copies of the selected tile on a phone, the selection following them onto a tile they join', async () => {
    stubScreen(PHONE);
    const user = await mountPageAndWrite(`4 ${SWORDS}{Enter}`);
    await user.click(stepBar().getByRole('button', { name: 'Carte' }));
    await user.click(await screen.findByRole('button', { name: `Modifica ${SWORDS}` }));
    const phonePanel = () => screen.getByRole('dialog', { name: 'Riga selezionata' });
    // The panel covers the tiles and their minus: the pluses split the line 4 + 1 + 1.
    await user.click(await screen.findByRole('button', { name: 'Una copia in più con MMQ #1' }));
    await user.click(screen.getByRole('button', { name: 'Una copia in più con C21 #1' }));
    await user.click(within(phonePanel()).getByRole('button', { name: 'Chiudi' }));
    await pressTileOf(user, 'MMQ #1');

    await tapPrint(user, 'STA #1');
    // The selection is now on STA: tapping C21 moves the STA copy, not the two ICE ones.
    await tapPrint(user, 'C21 #1');
    await user.click(within(phonePanel()).getByRole('button', { name: 'Chiudi' }));

    expect(tilesBySetAndNumber()).toEqual([
      ['C21 #1', '2×'],
      ['ICE #1', '4×'],
    ]);
  });
});

describe('the print search in the print picker', () => {
  const inspector = () => within(screen.getByRole('complementary', { name: 'Riga selezionata' }));
  const searchField = () => inspector().getByRole('searchbox', { name: 'Cerca variante' });

  /** The print picker's years and the prints under each, as set and number. */
  function pickerYears() {
    const picker = inspector().getByRole('region', { name: /^Stampe di / });
    return within(picker)
      .queryAllByRole('region')
      .map((year) => [
        year.getAttribute('aria-label'),
        within(year)
          .getAllByRole('group', { name: /^Copie con / })
          .map((group) => group.getAttribute('aria-label')?.replace('Copie con ', '')),
      ]);
  }

  /** Opens the panel of `1 Lightning Bolt`: TST (2020), M10 (2019) and 2X2 (2018), in English. */
  async function openLightningBolt() {
    const user = await mountPageAndWrite('1 Lightning Bolt{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Modifica Lightning Bolt' }));
    await inspector().findByText('3 stampe disponibili');
    return user;
  }

  it('shows only the prints found, still by year, with how many were found', async () => {
    const user = await openLightningBolt();

    await user.type(searchField(), '201');

    expect(await inspector().findByText('2 stampe trovate')).toBeTruthy();
    expect(pickerYears()).toEqual([
      ['2019', ['M10 #1']],
      ['2018', ['2X2 #1']],
    ]);
  });

  it('says so when no print matches, and the ✕ brings every print back', async () => {
    const user = await openLightningBolt();

    await user.type(searchField(), 'zzz');

    expect(await inspector().findByText('Nessuna stampa corrisponde a "zzz"')).toBeTruthy();
    expect(pickerYears()).toEqual([]);

    await user.click(inspector().getByRole('button', { name: 'Svuota la ricerca' }));

    expect(searchField()).toHaveProperty('value', '');
    expect(await inspector().findByText('3 stampe disponibili')).toBeTruthy();
    expect(document.activeElement).toBe(searchField());
  });

  it('treats a search of nothing but symbols as no search', async () => {
    const user = await openLightningBolt();

    await user.type(searchField(), ' - ');
    await act(() => new Promise((resolve) => setTimeout(resolve, SEARCH_TYPING_WAIT_MS + 50)));

    expect(inspector().getByText('3 stampe disponibili')).toBeTruthy();
    expect(vi.mocked(api.fetchPrintPage).mock.calls.map((call) => call[4] ?? '')).not.toContain(
      '-',
    );
  });

  it('keeps a pasted print query to the longest the server takes', async () => {
    const user = await openLightningBolt();
    await user.click(searchField());

    await user.paste('m'.repeat(MAX_PRINT_QUERY_LENGTH + 40));

    expect(searchField()).toHaveProperty('value', 'm'.repeat(MAX_PRINT_QUERY_LENGTH));
    expect(await inspector().findByText(/^Nessuna stampa corrisponde a/)).toBeTruthy();
    expect(inspector().queryByRole('alert')).toBeNull();
  });

  it('empties the search with Escape on the field, the panel staying open', async () => {
    const user = await openLightningBolt();
    await user.type(searchField(), 'm10');
    await inspector().findByText('1 stampa trovata');

    await user.keyboard('{Escape}');

    expect(searchField()).toHaveProperty('value', '');
    expect(await inspector().findByText('3 stampe disponibili')).toBeTruthy();
    expect(document.activeElement).toBe(searchField());
  });

  it('keeps the search when the user taps a print, changes its copies or the language', async () => {
    const user = await mountPageAndWrite('4 Brainstorm{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Modifica Brainstorm' }));
    await user.type(await inspector().findByRole('searchbox', { name: 'Cerca variante' }), 'ice');
    await inspector().findByText('1 stampa trovata');

    await user.click(inspector().getByRole('button', { name: 'Una copia in più con ICE #1' }));
    await user.click(inspector().getByRole('button', { name: 'Una copia in meno con ICE #1' }));
    await user.click(printButtonOf('ICE #1'));
    expect(searchField()).toHaveProperty('value', 'ice');

    await user.click(inspector().getByRole('radio', { name: 'Inglese (1)' }));

    expect(searchField()).toHaveProperty('value', 'ice');
    expect(await inspector().findByText('Nessuna stampa corrisponde a "ice"')).toBeTruthy();
  });

  it('empties the search when the user picks a sibling tile', async () => {
    const user = await mountPageAndWrite('4 Brainstorm{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Modifica Brainstorm' }));
    await user.type(await inspector().findByRole('searchbox', { name: 'Cerca variante' }), 'mmq');
    await user.click(
      await inspector().findByRole('button', { name: 'Una copia in più con MMQ #1' }),
    );

    await user.click(tileAt(1).getByRole('button', { name: 'Modifica Brainstorm' }));

    expect(searchField()).toHaveProperty('value', '');
    expect(await inspector().findByText('2 stampe disponibili')).toBeTruthy();
  });

  it('empties the search when the user opens the selected tile again with Enter', async () => {
    const user = await openLightningBolt();
    await user.type(searchField(), 'm10');
    await inspector().findByText('1 stampa trovata');

    gridTiles()[0]?.focus();
    await user.keyboard('{Enter}');

    expect(searchField()).toHaveProperty('value', '');
    expect(await inspector().findByText('3 stampe disponibili')).toBeTruthy();
  });

  it('never shows the answer to an older search that arrives after a newer one', async () => {
    const server = inMemoryServer(CATALOG);
    let answerOlderSearch = () => {};
    vi.mocked(api.fetchPrintPage).mockImplementation(
      (oracleId, lang, limit, cursor, printQuery) => {
        const page = server.fetchPrintPage(oracleId, lang, limit, cursor, printQuery);
        if (printQuery !== '2x2') return page;
        return new Promise((resolve) => (answerOlderSearch = () => resolve(page)));
      },
    );
    const user = await openLightningBolt();
    await user.type(searchField(), '2x2');
    await waitFor(() =>
      expect(vi.mocked(api.fetchPrintPage).mock.calls.map((call) => call[4])).toContain('2x2'),
    );

    await user.clear(searchField());
    await user.type(searchField(), 'm10');
    await inspector().findByText('1 stampa trovata');
    await act(async () => answerOlderSearch());

    expect(pickerYears()).toEqual([['2019', ['M10 #1']]]);
  });

  it('empties the search with Escape on a phone without closing the panel', async () => {
    stubScreen(PHONE);
    const user = await mountPageAndWrite('1 Lightning Bolt{Enter}');
    await user.click(stepBar().getByRole('button', { name: 'Carte' }));
    await user.click(await screen.findByRole('button', { name: 'Modifica Lightning Bolt' }));
    const phonePanel = () => within(screen.getByRole('dialog', { name: 'Riga selezionata' }));
    const field = await phonePanel().findByRole('searchbox', { name: 'Cerca variante' });
    await user.type(field, 'm10');
    await phonePanel().findByText('1 stampa trovata');

    await user.keyboard('{Escape}');

    expect(field).toHaveProperty('value', '');
    expect(await phonePanel().findByText('3 stampe disponibili')).toBeTruthy();
  });
});

describe('a print with an alternate name in the print picker', () => {
  it('tags only the prints that carry an alternate name, naming the card it stands for', async () => {
    const user = await mountPageAndWrite('1 Cyclonic Rift{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Modifica Cyclonic Rift' }));
    await screen.findByRole('group', { name: 'Copie con SLD #1869' });
    const printOf = (setAndNumber: string) => {
      const button = printButtonOf(setAndNumber);
      return within(button.closest('li') ?? button);
    };

    const tag = printOf('SLD #1869').getByText('nome alt.');

    expect(tag.title).toBe("Hope's Aero Magic: nome alternativo di Cyclonic Rift");
    expect(printOf('RTR #35').queryByText('nome alt.')).toBeNull();
  });
});

describe('the print picker while its prints load', () => {
  it('shows a spinner named after the prints it loads', async () => {
    const user = await mountPageAndWrite('4 Brainstorm{Enter}');
    vi.mocked(api.fetchPrintPage).mockReturnValue(new Promise(() => {}));

    await user.click(await screen.findByRole('button', { name: 'Modifica Brainstorm' }));

    expect(
      await screen.findByRole('progressbar', { name: 'Caricamento delle stampe…' }),
    ).toBeTruthy();
  });
});
