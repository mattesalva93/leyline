import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PHONE, stubScreen } from '../../test-support/test-screen.ts';
import {
  mountPageAndWrite,
  pickCandidate,
  stepBar,
  focusableTile,
  answerApiCallsFromCatalog,
} from '../../test-support/workspace-page.ts';
import { gridTiles, tileSummary } from '../../test-support/grid-queries.ts';

vi.mock('../../api.ts');

beforeEach(answerApiCallsFromCatalog);

describe('removing a line to fix', () => {
  function decklistValue() {
    return screen.getByLabelText<HTMLTextAreaElement>('Decklist').value;
  }

  it('removes a line it could not find from the decklist text and the grid, from its tile', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}2 Nonexistent Card{Enter}');
    await screen.findByText('Carta non trovata');

    await user.click(
      screen.getByRole('button', { name: 'Rimuovi 2 Nonexistent Card dalla lista' }),
    );

    expect(decklistValue()).toBe('4 Sol Ring\n');
    expect(gridTiles().map(tileSummary)).toEqual([['Immagine di Sol Ring', '4×', undefined]]);
  });

  it('removes an ambiguous line from its tile', async () => {
    const user = await mountPageAndWrite('1 Lightning{Enter}4 Sol Ring{Enter}');
    await screen.findByText('Quale carta intendevi?');

    await user.click(screen.getByRole('button', { name: 'Rimuovi 1 Lightning dalla lista' }));

    expect(decklistValue()).toBe('4 Sol Ring\n');
    expect(screen.queryByText('Quale carta intendevi?')).toBeNull();
  });

  it('removes a card with no printable print from its tile', async () => {
    const user = await mountPageAndWrite(
      '// my deck{Enter}1 Unscanned Card{Enter}4 Sol Ring{Enter}',
    );
    await screen.findByText('Nessuna stampa con immagine');

    await user.click(screen.getByRole('button', { name: 'Rimuovi Unscanned Card dalla lista' }));

    expect(decklistValue()).toBe('// my deck\n4 Sol Ring\n');
    expect(gridTiles().map(tileSummary)).toEqual([['Immagine di Sol Ring', '4×', undefined]]);
  });

  it('keeps the choices of the lines after the removed one', async () => {
    const user = await mountPageAndWrite('2 Nonexistent Card{Enter}2 Lightning{Enter}');
    await pickCandidate(user, 'Lightning Bolt');

    await user.click(
      screen.getByRole('button', { name: 'Rimuovi 2 Nonexistent Card dalla lista' }),
    );

    expect(decklistValue()).toBe('2 Lightning\n');
    expect(screen.getByRole('button', { name: 'Modifica Lightning Bolt' })).toBeTruthy();
  });

  it('offers no removal on a line still to recognise', async () => {
    await mountPageAndWrite('4 Sol Ring{Enter}1 Ponder');
    await screen.findByText('Da riconoscere: vai a capo o esci dal campo');

    expect(screen.queryByRole('button', { name: /^Rimuovi / })).toBeNull();
  });

  it('offers no removal in the panel of a line that has prints', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');

    await user.click(await screen.findByRole('button', { name: 'Modifica Sol Ring' }));

    const inspector = within(screen.getByRole('complementary', { name: 'Riga selezionata' }));
    expect(inspector.queryByRole('button', { name: /^Rimuovi / })).toBeNull();
  });

  it('removes a line it could not find from the keyboard, through its line to fix, back to the summary', async () => {
    const user = await mountPageAndWrite('2 Nonexistent Card{Enter}4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });
    focusableTile('2 Nonexistent Card, Carta non trovata').focus();

    await user.keyboard('{Enter}');
    const lineToFix = within(screen.getByRole('complementary', { name: 'Riga da sistemare' }));
    await user.click(
      lineToFix.getByRole('button', { name: 'Rimuovi 2 Nonexistent Card dalla lista' }),
    );

    expect(decklistValue()).toBe('4 Sol Ring\n');
    expect(screen.getByRole('complementary', { name: 'Riepilogo' })).toBeTruthy();
  });

  it('removes a card with no printable print from its line panel, back to the summary', async () => {
    const user = await mountPageAndWrite('1 Unscanned Card{Enter}4 Sol Ring{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Modifica Unscanned Card' }));

    const inspector = within(screen.getByRole('complementary', { name: 'Riga selezionata' }));
    await user.click(inspector.getByRole('button', { name: 'Rimuovi Unscanned Card dalla lista' }));

    expect(decklistValue()).toBe('4 Sol Ring\n');
    expect(screen.getByRole('complementary', { name: 'Riepilogo' })).toBeTruthy();
  });

  it('removes a line to fix from its panel on a phone, closing the panel', async () => {
    stubScreen(PHONE);
    const user = await mountPageAndWrite('2 Nonexistent Card{Enter}4 Sol Ring{Enter}');
    await user.click(stepBar().getByRole('button', { name: 'Carte' }));
    focusableTile('2 Nonexistent Card, Carta non trovata').focus();
    await user.keyboard('{Enter}');
    const panel = await screen.findByRole('dialog', { name: 'Riga da sistemare' });

    await user.click(
      within(panel).getByRole('button', { name: 'Rimuovi 2 Nonexistent Card dalla lista' }),
    );

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(gridTiles().map(tileSummary)).toEqual([['Immagine di Sol Ring', '4×', undefined]]);
  });
});
