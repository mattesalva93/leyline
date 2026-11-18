import { defaultSheetOptions } from '@mtg-suite/core';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../api.ts';
import { mountApp } from '../test-support/mount-app.tsx';
import {
  reload,
  mountPageAndWrite,
  pickCandidate,
  moveOneCopy,
  decklistValue,
  answerApiCallsFromCatalog,
} from '../test-support/workspace-page.ts';
import { centreTab, cardGrid, gridTiles, tileSummary } from '../test-support/grid-queries.ts';

vi.mock('../api.ts');

beforeEach(answerApiCallsFromCatalog);

describe('the decklist saved on the device', () => {
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

  it('opens straight on the workspace, never the landing page, even while the server is out of reach', async () => {
    await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });
    vi.mocked(api.resolveDecklistText).mockRejectedValue(new Error('offline'));

    reload();

    expect(screen.queryByRole('button', { name: 'Prova con un esempio' })).toBeNull();
    expect(cardGrid()).toBeTruthy();
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Prova con un esempio' })).toBeNull();
    expect(decklistValue()).toBe('4 Sol Ring\n');
  });

  it("brings back each line's choices: the candidate picked and the copies on prints of either language", async () => {
    const user = await mountPageAndWrite('1 Lightning{Enter}4 Brainstorm{Enter}');
    await pickCandidate(user, 'Lightning Bolt');
    await user.click(screen.getByRole('button', { name: 'Modifica Brainstorm' }));
    await moveOneCopy(user, 'Brainstorm', 'ICE #1', 'MMQ #1');
    await user.click(await screen.findByRole('radio', { name: 'Inglese (1)' }));
    await moveOneCopy(user, 'Brainstorm', 'ICE #1', 'C21 #1');

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

  it('brings back the choices saved before prints had a set name and artists', async () => {
    const user = await mountPageAndWrite('4 Brainstorm{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Modifica Brainstorm' }));
    await moveOneCopy(user, 'Brainstorm', 'ICE #1', 'MMQ #1');
    const saved = localStorage.getItem('mtg-suite.decklist') ?? '';
    const withoutNewFields = saved.replace(/"setName":"[^"]*",|,?"artist":"[^"]*"/g, '');
    expect(withoutNewFields).not.toMatch(/setName|artist/);
    localStorage.setItem('mtg-suite.decklist', withoutNewFields);

    reload();

    await waitFor(() =>
      expect(gridTiles().map(tileSummary)).toEqual([
        ['Immagine di Brainstorm', '3×', '1/2'],
        ['Immagine di Brainstorm', '1×', '2/2'],
      ]),
    );
  });

  it('brings back the sheet options', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });
    await user.click(centreTab('Foglio'));
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
    await user.click(centreTab('Foglio'));

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
