import { act, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PHONE, stubScreen } from '../../test-support/test-screen.ts';
import {
  mountPageAndWrite,
  stepBar,
  decklistValue,
  focusableTile,
  answerApiCallsFromCatalog,
} from '../../test-support/workspace-page.ts';
import { cardGrid, gridTiles, tileAt, focusOutlineOf } from '../../test-support/grid-queries.ts';
import { animateRadixParts, endExitAnimation } from '../../test-support/exit-animations.ts';

vi.mock('../../api.ts');

beforeEach(answerApiCallsFromCatalog);

describe('the card grid from the keyboard', () => {
  /** Mounts the page with `decklistText` and puts the focus on the button just before the grid. */
  async function focusBeforeTheGrid(decklistText: string, lastCardName: string) {
    const user = await mountPageAndWrite(decklistText);
    await screen.findByRole('button', { name: `Modifica ${lastCardName}` });
    screen.getByRole('button', { name: 'Controlla il foglio →' }).focus();
    return user;
  }

  it('outlines a focused line to fix and a focused add-card tile as far out as a focused card', async () => {
    await mountPageAndWrite('2 Nonexistent Card{Enter}1 Sol Ring{Enter}');
    await screen.findByRole('img', { name: /^Immagine di Sol Ring/ });
    const [lineToFix, card] = gridTiles();
    const lineToFixBox = lineToFix?.querySelector<HTMLElement>('[style*="outline-offset"]');
    const addCardTile = screen.getByRole('button', { name: 'Aggiungi una carta a Mazzo' });

    const cardFocusOffset = focusOutlineOf(card).style.outlineOffset;

    expect(cardFocusOffset).not.toBe('');
    expect(lineToFixBox?.style.outlineOffset).toBe(cardFocusOffset);
    expect(addCardTile.style.outlineOffset).toBe(cardFocusOffset);
  });

  it('takes one stop of Tab, on its first tile, and the next Tab leaves it', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}1 Lightning Bolt{Enter}');
    await screen.findByRole('button', { name: 'Modifica Lightning Bolt' });
    // The X of a guided step pointing to the first tile would be the next stop.
    await user.click(screen.getByRole('button', { name: 'Salta questo passo' }));
    screen.getByRole('button', { name: 'Controlla il foglio →' }).focus();

    await user.tab();
    expect(document.activeElement).toBe(gridTiles()[0]);

    await user.tab();
    expect(cardGrid().contains(document.activeElement)).toBe(false);
  });

  it('moves the focus from tile to tile with the arrows, on through the next section', async () => {
    const user = await focusBeforeTheGrid(
      '4 Sol Ring{Enter}Sideboard{Enter}1 Pyroblast{Enter}',
      'Pyroblast',
    );
    await user.tab();

    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Aggiungi una carta a Mazzo' }),
    );
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(
      focusableTile('Pyroblast, TST #1, 1 copia, Stampa in inglese'),
    );
    await user.keyboard('{ArrowUp}{ArrowLeft}');
    expect(document.activeElement).toBe(
      focusableTile('Sol Ring, C21 #1, 4 copie, Stampa in inglese'),
    );
  });

  it('comes back by Tab to the tile it left', async () => {
    const user = await focusBeforeTheGrid(
      '4 Sol Ring{Enter}1 Lightning Bolt{Enter}',
      'Lightning Bolt',
    );
    await user.tab();
    await user.keyboard('{ArrowRight}');

    await user.tab();
    await user.tab({ shift: true });

    expect(document.activeElement).toBe(
      focusableTile('Lightning Bolt, TST #1, 1 copia, Stampa in inglese'),
    );
  });

  it('opens the line panel of the focused tile with Enter, and goes back to the tile with Escape', async () => {
    const user = await focusBeforeTheGrid(
      '4 Sol Ring{Enter}1 Lightning Bolt{Enter}',
      'Lightning Bolt',
    );
    await user.tab();
    await user.keyboard('{ArrowRight}');

    await user.keyboard('{Enter}');

    const inspector = screen.getByRole('complementary', { name: 'Riga selezionata' });
    expect(within(inspector).getByRole('heading', { name: 'Lightning Bolt' })).toBeTruthy();
    expect(inspector.contains(document.activeElement)).toBe(true);
    await user.keyboard('{Escape}');
    expect(document.activeElement).toBe(
      focusableTile('Lightning Bolt, TST #1, 1 copia, Stampa in inglese'),
    );
  });

  it('opens the line panel of a folded inspector with Enter', async () => {
    const user = await focusBeforeTheGrid('4 Sol Ring{Enter}', 'Sol Ring');
    await user.click(screen.getByRole('button', { name: 'Richiudi il pannello «Riepilogo»' }));
    screen.getByRole('button', { name: 'Controlla il foglio →' }).focus();
    await user.tab();

    await user.keyboard('{Enter}');

    const inspector = screen.getByRole('complementary', { name: 'Riga selezionata' });
    expect(within(inspector).getByRole('heading', { name: 'Sol Ring' })).toBeTruthy();
    expect(inspector.contains(document.activeElement)).toBe(true);
  });

  it('opens the line to fix of a focused imageless tile with Enter', async () => {
    const user = await focusBeforeTheGrid('2 Nonexistent Card{Enter}4 Sol Ring{Enter}', 'Sol Ring');
    await user.tab();

    await user.keyboard('{Enter}');

    expect(screen.getByRole('complementary', { name: 'Riga da sistemare' })).toBeTruthy();
  });

  it('opens the line panel of the focused tile with Enter on a phone, and gives the focus back to the tile as it closes', async () => {
    stubScreen(PHONE);
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await user.click(stepBar().getByRole('button', { name: 'Carte' }));
    focusableTile('Sol Ring, C21 #1, 4 copie, Stampa in inglese').focus();

    await user.keyboard('{Enter}');
    const panel = await screen.findByRole('dialog', { name: 'Riga selezionata' });
    expect(within(panel).getByRole('heading', { name: 'Sol Ring' })).toBeTruthy();
    await user.keyboard('{Escape}');

    await waitFor(() =>
      expect(document.activeElement).toBe(
        focusableTile('Sol Ring, C21 #1, 4 copie, Stampa in inglese'),
      ),
    );
  });

  it('gives the focus back to the tile once the phone panel has slid away', async () => {
    stubScreen(PHONE);
    animateRadixParts();
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await user.click(stepBar().getByRole('button', { name: 'Carte' }));
    focusableTile('Sol Ring, C21 #1, 4 copie, Stampa in inglese').focus();
    await user.keyboard('{Enter}');
    const panel = await screen.findByRole('dialog', { name: 'Riga selezionata' });

    await user.keyboard('{Escape}');
    act(() => endExitAnimation(panel));

    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() =>
      expect(document.activeElement).toBe(
        focusableTile('Sol Ring, C21 #1, 4 copie, Stampa in inglese'),
      ),
    );
  });

  it('adds and takes off a copy of the focused tile with plus and minus, and the decklist text says so', async () => {
    const user = await focusBeforeTheGrid(
      '4 Sol Ring{Enter}1 Lightning Bolt{Enter}',
      'Lightning Bolt',
    );
    await user.tab();

    await user.keyboard('++');
    expect(decklistValue()).toBe('6 Sol Ring\n1 Lightning Bolt\n');
    await user.keyboard('-');

    expect(decklistValue()).toBe('5 Sol Ring\n1 Lightning Bolt\n');
    expect(document.activeElement).toBe(
      focusableTile('Sol Ring, C21 #1, 5 copie, Stampa in inglese'),
    );
  });

  it('passes the focus to the tile that takes the place of one brought to zero', async () => {
    const user = await focusBeforeTheGrid(
      '1 Sol Ring{Enter}1 Lightning Bolt{Enter}1 Pyroblast{Enter}',
      'Pyroblast',
    );
    await user.tab();
    await user.keyboard('{ArrowRight}');

    await user.keyboard('-');

    expect(decklistValue()).toBe('1 Sol Ring\n1 Pyroblast\n');
    expect(document.activeElement).toBe(
      focusableTile('Pyroblast, TST #1, 1 copia, Stampa in inglese'),
    );
  });

  it('turns the focused double-faced card over with F, and names to a screen reader the face it shows', async () => {
    const user = await focusBeforeTheGrid(
      '1 Delver of Secrets{Enter}',
      'Delver of Secrets // Insectile Aberration',
    );
    await user.tab();

    await user.keyboard('f');

    expect(tileAt(0).getByRole('img', { name: 'Immagine di Insectile Aberration' })).toBeTruthy();
    expect(document.activeElement?.getAttribute('aria-label')).toBe(
      'Delver of Secrets // Insectile Aberration, ISD #1, 1 copia, girata su Insectile Aberration, Stampa in inglese',
    );
  });

  it('takes plus, minus and the arrows once a click has put the focus on a button of the tile', async () => {
    const user = await focusBeforeTheGrid(
      '4 Sol Ring{Enter}1 Lightning Bolt{Enter}',
      'Lightning Bolt',
    );
    await user.click(screen.getByRole('button', { name: 'Una copia in più di Sol Ring (C21 #1)' }));

    await user.keyboard('+{ArrowRight}');

    expect(decklistValue()).toBe('6 Sol Ring\n1 Lightning Bolt\n');
    expect(document.activeElement).toBe(
      focusableTile('Lightning Bolt, TST #1, 1 copia, Stampa in inglese'),
    );
  });

  it('names to a screen reader the card, the print and the copies of each tile, and the warning of its print', async () => {
    await focusBeforeTheGrid('3 Counterspell{Enter}4 Sol Ring{Enter}', 'Sol Ring');

    expect(gridTiles().map((tile) => tile.getAttribute('aria-label'))).toEqual([
      'Counterspell, MH2 #1, 3 copie',
      'Sol Ring, C21 #1, 4 copie, Stampa in inglese',
    ]);
  });

  it('names to a screen reader the line of a tile to fix and what is wrong with it', async () => {
    await mountPageAndWrite('4 Sol Ring{Enter}2 Nonexistent Card{Enter}');
    await screen.findByText('Carta non trovata');

    expect(focusableTile('2 Nonexistent Card, Carta non trovata')).toBeTruthy();
  });
});
