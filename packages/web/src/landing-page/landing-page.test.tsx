import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountApp } from '../test-support/mount-app.tsx';
import { PHONE, stubScreen } from '../test-support/test-screen.ts';
import {
  mountPageAndWrite,
  summary,
  stepBar,
  decklistValue,
  answerApiCallsFromCatalog,
} from '../test-support/workspace-page.ts';
import { cardGrid, gridTiles, tileSummary } from '../test-support/grid-queries.ts';

vi.mock('../api.ts');

beforeEach(answerApiCallsFromCatalog);

describe('the landing page', () => {
  it('opens when the device keeps no decklist: the explanation, the decklist text and the example button, with no zone of the workspace', () => {
    mountApp('/proxy');

    expect(screen.getByText(/^Incolla o scrivi una decklist, una carta per riga/)).toBeTruthy();
    expect(screen.getByLabelText('Decklist')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Prova con un esempio' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Aggiungi una carta/ })).toBeNull();
    expect(screen.queryByRole('tablist')).toBeNull();
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

  it('opens when the device keeps nothing at all', () => {
    const blockedRead = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    try {
      mountApp('/proxy');

      expect(screen.getByRole('button', { name: 'Prova con un esempio' })).toBeTruthy();
    } finally {
      blockedRead.mockRestore();
    }
  });

  it('never comes back once the decklist text is emptied: the workspace stays, its grid empty', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });

    await user.clear(screen.getByLabelText('Decklist'));

    expect(screen.queryByRole('button', { name: 'Prova con un esempio' })).toBeNull();
    expect(gridTiles()).toEqual([]);
    expect(within(cardGrid()).getAllByRole('button')).toHaveLength(1);
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

    it('shows the explanation, the decklist text and the example button, with no step bar', async () => {
      const user = await mountPageAndWrite('4 Sol Ring');

      expect(screen.getByText(/^Incolla o scrivi una decklist, una carta per riga/)).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Prova con un esempio' })).toBeTruthy();
      expect(screen.queryByRole('region', { name: 'Riepilogo' })).toBeNull();
      expect(screen.queryByRole('navigation', { name: 'Passi' })).toBeNull();

      await user.keyboard('{Enter}');

      expect(await screen.findByRole('region', { name: 'Riepilogo' })).toBeTruthy();
      expect(stepBar().getByRole('button', { name: 'Carte' })).toBeTruthy();
      await user.keyboard('1 Brainstorm');
      expect(decklistValue()).toBe('4 Sol Ring\n1 Brainstorm');
    });

    it('never comes back when the last card goes from another step: that step stays, its grid empty', async () => {
      const user = await mountPageAndWrite('1 Sol Ring{Enter}');
      await user.click(stepBar().getByRole('button', { name: 'Carte' }));

      await user.click(
        screen.getByRole('button', { name: 'Una copia in meno di Sol Ring (C21 #1)' }),
      );

      expect(screen.queryByRole('button', { name: 'Prova con un esempio' })).toBeNull();
      expect(stepBar().getByRole('button', { name: 'Carte' }).getAttribute('aria-current')).toBe(
        'step',
      );
      expect(gridTiles()).toEqual([]);
    });
  });
});
