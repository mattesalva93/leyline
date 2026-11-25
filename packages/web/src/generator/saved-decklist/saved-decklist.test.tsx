import { defaultSheetOptions } from '@leyline/core';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../../api.ts';
import { mountApp } from '../../test-support/mount-app.tsx';
import {
  reload,
  mountPageAndWrite,
  pickCandidate,
  moveOneCopy,
  decklistValue,
  answerApiCallsFromCatalog,
} from '../../test-support/workspace-page.ts';
import { centreTab, cardGrid, gridTiles, tileSummary } from '../../test-support/grid-queries.ts';
// Frozen copies of what older versions saved: never edit them, they prove the migrations hold.
import savedByVersion1WithSetNames from './frozen-versions/v1-with-set-names-artists-and-alternate-names.json?raw';
import savedByVersion1BeforeSetNames from './frozen-versions/v1-before-set-names-artists-and-alternate-names.json?raw';

vi.mock('../../api.ts');

beforeEach(answerApiCallsFromCatalog);

const SAVED_KEY = 'leyline.decklist';
const SET_ASIDE_KEY = 'leyline.decklist.setAside';

const aVersion2Decklist = {
  version: 2,
  decklistText: '4 Sol Ring',
  choicesByLine: [],
  sheetOptions: defaultSheetOptions,
};

/** Opens the generator on the decklist the device kept, once its grid is filled. */
async function mountSavedDecklist() {
  const user = userEvent.setup();
  mountApp('/proxy');
  await screen.findAllByRole('button', { name: 'Modifica Brainstorm' });
  return user;
}

/**
 * The decklist the frozen copies hold: a candidate picked for "Lightning", Brainstorm's copies
 * spread over prints of either language, and sheet options changed from their defaults.
 */
async function expectTheSavedDecklist(user: ReturnType<typeof userEvent.setup>) {
  expect(decklistValue()).toBe('1 Lightning\n4 Brainstorm\n');
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

  await user.click(centreTab('Foglio'));
  const field = (label: string) => screen.getByLabelText<HTMLInputElement>(label);
  expect(field('Formato della pagina').value).toBe('Letter');
  expect(field('Qualità delle immagini').value).toBe('png');
  expect(field('Segni di taglio').checked).toBe(false);
  expect(field('Margine dal bordo del foglio (mm)').value).toBe('8');
  expect(field('Spazio tra le carte (mm)').value).toBe('2');
}

describe('the decklist saved on the device', () => {
  it.each([
    [' with set names, artists and alternate names', savedByVersion1WithSetNames],
    [' before prints had a set name, artists and alternate names', savedByVersion1BeforeSetNames],
  ])(
    'brings back a decklist saved by version 1%s: lines, choices, copies per print and sheet options',
    async (_kind, stored) => {
      localStorage.setItem(SAVED_KEY, stored);

      const user = await mountSavedDecklist();

      await expectTheSavedDecklist(user);
    },
  );

  it('saves a decklist brought back from version 1 as version 2, which comes back whole', async () => {
    localStorage.setItem(SAVED_KEY, savedByVersion1BeforeSetNames);
    await mountSavedDecklist();

    const rewritten = JSON.parse(localStorage.getItem(SAVED_KEY) ?? '') as {
      version: number;
      choicesByLine: [string, { allocations?: { allocations: { print: unknown }[] } }][];
    };
    expect(rewritten.version).toBe(2);
    const prints = rewritten.choicesByLine.flatMap(
      ([, choices]) => choices.allocations?.allocations.map(({ print }) => print) ?? [],
    );
    expect(prints).toEqual([
      expect.objectContaining({
        setName: '',
        flavorName: null,
        faces: [expect.objectContaining({ artist: '' })],
      }),
      expect.objectContaining({
        setName: '',
        flavorName: null,
        faces: [expect.objectContaining({ artist: '' })],
      }),
    ]);

    reload();

    await expectTheSavedDecklist(userEvent.setup());
  });

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

  it('opens straight on the workspace with its grid, never empty, even while the server is out of reach', async () => {
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
    ['not readable', '{"version": 2, "decklistText": '],
    ['of an unknown version', JSON.stringify({ ...aVersion2Decklist, version: 99 })],
    ['saved by a newer release', JSON.stringify({ ...aVersion2Decklist, version: 3 })],
    ['with no version', JSON.stringify({ ...aVersion2Decklist, version: undefined })],
    ['of the wrong shape', JSON.stringify({ version: 1, decklistText: ['4 Sol Ring'] })],
    [
      'of version 2 missing what version 1 could leave out',
      savedByVersion1BeforeSetNames.replace('"version": 1', '"version": 2'),
    ],
  ])('starts empty, with no error, setting aside saved data %s', (_kind, stored) => {
    localStorage.setItem(SAVED_KEY, stored);

    mountApp('/proxy');

    expect(decklistValue()).toBe('');
    expect(screen.getByRole('button', { name: 'Prova con un esempio' })).toBeTruthy();
    expect(localStorage.getItem(SET_ASIDE_KEY)).toBe(stored);
  });

  it('keeps the data set aside while a new decklist is saved', async () => {
    localStorage.setItem(SAVED_KEY, 'not a decklist');

    await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });

    expect(localStorage.getItem(SET_ASIDE_KEY)).toBe('not a decklist');
    expect(localStorage.getItem(SAVED_KEY)).toContain('4 Sol Ring');
  });

  it('keeps only the last data set aside', () => {
    localStorage.setItem(SAVED_KEY, 'the first unreadable decklist');
    mountApp('/proxy');
    cleanup();
    localStorage.setItem(SAVED_KEY, 'the second unreadable decklist');

    mountApp('/proxy');

    expect(localStorage.getItem(SET_ASIDE_KEY)).toBe('the second unreadable decklist');
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
