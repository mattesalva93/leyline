import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../../api.ts';
import { inMemoryServer } from '../../test-support/in-memory-server.ts';
import {
  catalogEntry,
  CATALOG,
  reload,
  mountPageAndWrite,
  decklistValue,
  searchToAdd,
  answerApiCallsFromCatalog,
} from '../../test-support/workspace-page.ts';
import { cardGrid, gridSections } from '../../test-support/grid-queries.ts';

vi.mock('../../api.ts');

beforeEach(answerApiCallsFromCatalog);

describe('the add tile', () => {
  it('ends each section of the grid', async () => {
    await mountPageAndWrite('4 Sol Ring{Enter}{Enter}Sideboard{Enter}1 Pyroblast{Enter}');
    await screen.findByRole('button', { name: 'Modifica Pyroblast' });

    const sections = within(cardGrid()).getAllByRole('region');
    expect(
      sections.map((section) => within(section).getAllByRole('listitem').at(-1)?.textContent),
    ).toEqual(['Aggiungi una carta', 'Aggiungi una carta']);
  });

  it('opens an empty section with its header in the text, and its title in the grid', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    const found = await searchToAdd(user, 'Mazzo', 'pyrobl', 'Token');

    await user.click(await within(found).findByRole('option', { name: /Pyroblast/ }));

    expect(decklistValue()).toBe('4 Sol Ring\n\nTokens\n1 Pyroblast');
    expect(gridSections()).toEqual([
      ['Mazzo 4 carte', ['Immagine di Sol Ring']],
      ['Token 1 carta', ['Immagine di Pyroblast']],
    ]);
  });

  it('is the only tile of an empty decklist, naming no section, and adds to the main deck', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });
    await user.clear(screen.getByLabelText('Decklist'));

    const [onlyTile, ...others] = within(cardGrid()).getAllByRole('button');
    expect(others).toEqual([]);
    expect(onlyTile?.textContent).toBe('Aggiungi carta');
    expect(onlyTile?.getAttribute('aria-label')).toBe('Aggiungi carta');
    const found = await searchToAdd(user, null, 'brainst');
    await user.click(await within(found).findByRole('option', { name: /Brainstorm/ }));

    expect(decklistValue()).toBe('1 Brainstorm');
  });

  it('adds to the section picked from the only tile of an empty decklist, opening it', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });
    await user.clear(screen.getByLabelText('Decklist'));
    const found = await searchToAdd(user, null, 'pyrobl', 'Sideboard');

    await user.click(await within(found).findByRole('option', { name: /Pyroblast/ }));

    expect(decklistValue()).toBe('Sideboard\n1 Pyroblast');
    expect(gridSections()).toEqual([['Sideboard 1 carta', ['Immagine di Pyroblast']]]);
  });

  it('picks the section of the tile on each opening, whatever the last one picked', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    const tile = await screen.findByRole('button', { name: 'Aggiungi una carta a Mazzo' });
    await user.click(tile);
    await user.click(screen.getByRole('radio', { name: 'Token' }));
    await user.click(screen.getByRole('button', { name: 'Chiudi' }));

    await user.click(tile);

    const picker = screen.getByRole('radiogroup', { name: 'Sezione di destinazione' });
    expect(
      within(picker)
        .getAllByRole('radio')
        .map((radio) => [radio.closest('label')?.textContent, (radio as HTMLInputElement).checked]),
    ).toEqual([
      ['Comandante', false],
      ['Mazzo', true],
      ['Terre', false],
      ['Sideboard', false],
      ['Token', false],
    ]);
  });

  it('starts each search in the name field', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');

    await user.click(await screen.findByRole('button', { name: 'Aggiungi una carta a Mazzo' }));

    expect(document.activeElement).toBe(screen.getByRole('combobox', { name: 'Nome della carta' }));
  });

  it('changes section with the arrows, as a radio group, opening the sideboard from the main deck', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Aggiungi una carta a Mazzo' }));
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Mazzo' }));

    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Sideboard' })).toHaveProperty('checked', true);
    await user.tab();
    await user.keyboard('pyrobl');
    const found = await screen.findByRole('listbox', { name: 'Carte trovate' });
    await user.click(await within(found).findByRole('option', { name: /Pyroblast/ }));

    expect(decklistValue()).toBe('4 Sol Ring\n\nSideboard\n1 Pyroblast');
  });

  it('titles its search after the section picked', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Aggiungi una carta a Mazzo' }));
    expect(screen.getByRole('dialog', { name: 'Aggiungi una carta a Mazzo' })).toBeTruthy();

    await user.click(screen.getByRole('radio', { name: 'Terre' }));

    expect(screen.getByRole('dialog', { name: 'Aggiungi una carta a Terre' })).toBeTruthy();
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

  it('shows a spinner named after the search while it searches', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    vi.mocked(api.searchCardsByName).mockReturnValue(new Promise(() => {}));

    await searchToAdd(user, 'Mazzo', 'lightn');

    expect(screen.getByRole('progressbar', { name: 'Ricerca in corso…' })).toBeTruthy();
  });

  it('shows a spinner named after the versions it loads, opening a name shared by several cards', async () => {
    const otherIsland = catalogEntry('island-other', 'Island', 'oth');
    Object.entries(inMemoryServer([...CATALOG, otherIsland])).forEach(([call, answer]) => {
      vi.mocked(api[call as keyof typeof api]).mockImplementation(answer as never);
    });
    vi.mocked(api.fetchCardsNamed).mockReturnValue(new Promise(() => {}));
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    const found = await searchToAdd(user, 'Mazzo', 'island');

    await user.click(await within(found).findByRole('option', { name: 'Island: 2 versioni' }));

    expect(screen.getByRole('progressbar', { name: 'Carico le versioni di Island…' })).toBeTruthy();
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
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });
    vi.mocked(api.resolveDecklistText).mockImplementation(() => new Promise(() => {}));
    reload();
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
    expect(await screen.findByText('Quale Island?')).toBeTruthy();
    const found = await searchToAdd(user, 'Mazzo', 'island');

    await user.click(await within(found).findByRole('option', { name: 'Island: 2 versioni' }));
    const [firstIsland] = await screen.findAllByRole('button', { name: /^Island, / });
    if (!firstIsland) throw new Error('no Island found');
    await user.click(firstIsland);

    expect(decklistValue()).toBe('2 Island\n');
    expect(screen.getByRole('button', { name: 'Modifica Island' })).toBeTruthy();
    expect(screen.queryByText('Quale Island?')).toBeNull();
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

  it('fills a decklist emptied in the workspace again', async () => {
    const user = await mountPageAndWrite('1 Brainstorm{Enter}');
    await screen.findByRole('button', { name: 'Modifica Brainstorm' });
    await user.clear(screen.getByLabelText('Decklist'));
    const found = await searchToAdd(user, null, 'sol ri');

    await user.click(await within(found).findByRole('option', { name: /Sol Ring/ }));

    expect(await screen.findByRole('button', { name: 'Modifica Sol Ring' })).toBeTruthy();
    expect(decklistValue()).toBe('1 Sol Ring');
  });
});
