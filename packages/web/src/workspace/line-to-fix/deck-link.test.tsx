import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  answerApiCallsFromCatalog,
  decklistValue,
  focusableTile,
  mountPageAndWrite,
  summary,
} from '../../test-support/workspace-page.ts';

vi.mock('../../api.ts');

beforeEach(answerApiCallsFromCatalog);

function lineToFixPanel() {
  return within(screen.getByRole('complementary', { name: 'Riga da sistemare' }));
}

describe('a deck link in the decklist', () => {
  it('is a line to fix, which the tile and the panel explain for the site it links to', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}https://moxfield.com/decks/abc{Enter}');
    await screen.findByText('Link a un mazzo Moxfield');

    await user.click(summary().getByRole('button', { name: '1 riga da sistemare' }));

    expect(
      lineToFixPanel().getByText(
        'Leyline non importa i mazzi da un link. Su Moxfield apri il mazzo, poi Export (nel menu More o dal pulsante Download), premi Copy for Moxfield e incolla qui la lista.',
      ),
    ).toBeTruthy();
    expect(focusableTile('https://moxfield.com/decks/abc, Link a un mazzo Moxfield')).toBeTruthy();
  });

  it('explains how to export from Archidekt, and from any other site', async () => {
    await mountPageAndWrite(
      'archidekt.com/decks/123/x{Enter}https://www.mtggoldfish.com/deck/1{Enter}',
    );

    expect(await screen.findByText('Link a un mazzo Archidekt')).toBeTruthy();
    expect(
      screen.getByText(
        'Leyline non importa i mazzi da un link. Su Archidekt apri il mazzo, scegli Export deck, lascia Text, premi Copy e incolla qui la lista.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Link a un mazzo')).toBeTruthy();
    expect(
      screen.getByText(
        'Leyline non importa i mazzi da un link. Esporta il mazzo dal sito come testo, una carta per riga (per esempio «4 Sol Ring»), e incolla qui la lista.',
      ),
    ).toBeTruthy();
  });

  it('stays in the decklist text until the user removes it', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}https://moxfield.com/decks/abc{Enter}');
    await screen.findByText('Link a un mazzo Moxfield');
    expect(decklistValue()).toBe('4 Sol Ring\nhttps://moxfield.com/decks/abc\n');

    await user.click(
      screen.getByRole('button', { name: 'Rimuovi https://moxfield.com/decks/abc dalla lista' }),
    );

    expect(decklistValue()).toBe('4 Sol Ring\n');
  });
});
