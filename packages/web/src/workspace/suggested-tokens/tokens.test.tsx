import { CARD_SEARCH_LIMIT, type CatalogEntry } from '@leyline/core';
import { aCard } from '@leyline/core/test-fixtures';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../../api.ts';
import { inMemoryServer } from '../../test-support/in-memory-server.ts';
import {
  printOf,
  catalogEntry,
  CATALOG,
  reload,
  mountPageAndWrite,
  pickCandidate,
  moveOneCopy,
  summary,
  decklistValue,
  searchToAdd,
  answerApiCallsFromCatalog,
} from '../../test-support/workspace-page.ts';
import {
  cardGrid,
  centreTab,
  gridTiles,
  tileSummary,
  printButtonOf,
} from '../../test-support/grid-queries.ts';

vi.mock('../../api.ts');

beforeEach(answerApiCallsFromCatalog);

describe('the suggested tokens', () => {
  const tokenEntry = (oracleId: string, name: string, set: string, number: string) => ({
    card: aCard({ oracleId, name }),
    prints: [{ ...printOf(name, `${oracleId}-${set}`, set), collectorNumber: number }],
  });
  const TREASURE = tokenEntry('treasure', 'Treasure', 'tsnc', '16');
  const SOLDIER = tokenEntry('soldier', 'Soldier', 'twar', '3');
  const GOLD_FORGER = catalogEntry('gold-forger', 'Gold Forger');
  const RAISE_THE_ALARM = catalogEntry('raise-the-alarm', 'Raise the Alarm');
  /** Only its older print creates a token. */
  const PIA_NALAAR = catalogEntry('pia-nalaar', 'Pia Nalaar', 'new', 'old');

  beforeEach(() => {
    const server = inMemoryServer(
      [...CATALOG, TREASURE, SOLDIER, GOLD_FORGER, RAISE_THE_ALARM, PIA_NALAAR],
      [
        { creatorPrintId: 'gold-forger-tst', tokenPrintId: 'treasure-tsnc' },
        { creatorPrintId: 'raise-the-alarm-tst', tokenPrintId: 'soldier-twar' },
        { creatorPrintId: 'pia-nalaar-old', tokenPrintId: 'soldier-twar' },
      ],
    );
    Object.entries(server).forEach(([call, answer]) => {
      vi.mocked(api[call as keyof typeof api]).mockImplementation(answer as never);
    });
  });

  it('ends the card grid with the suggested tokens, each with its image and the cards creating it', async () => {
    await mountPageAndWrite('1 Gold Forger{Enter}1 Raise the Alarm{Enter}');

    const suggestions = await screen.findByRole('region', { name: 'Pedine proposte' });
    const grid = screen.getByRole('region', { name: 'Griglia delle carte' });
    expect(within(grid).getAllByRole('region').at(-1)).toBe(suggestions);
    const treasure = within(suggestions).getByRole('listitem', { name: 'Treasure' });
    expect(within(treasure).getByRole('img', { name: 'Immagine di Treasure' })).toBeTruthy();
    expect(within(treasure).getByText('da Gold Forger')).toBeTruthy();
  });

  it('adds a suggested token as a line of the Tokens section, named by set and number', async () => {
    const user = await mountPageAndWrite('1 Gold Forger{Enter}');

    await user.click(await screen.findByRole('button', { name: 'Aggiungi Treasure (TSNC 16)' }));

    expect(decklistValue()).toContain('Tokens\n1 Treasure (TSNC) 16');
    expect(await screen.findByRole('button', { name: 'Modifica Treasure' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Aggiungi Treasure (TSNC 16)' })).toBeNull();
  });

  it('adds every suggested token at once', async () => {
    const user = await mountPageAndWrite('1 Gold Forger{Enter}1 Raise the Alarm{Enter}');
    await screen.findByRole('button', { name: 'Aggiungi Soldier (TWAR 3)' });

    await user.click(screen.getByRole('button', { name: 'Aggiungi tutte' }));

    expect(decklistValue()).toContain('Tokens\n1 Treasure (TSNC) 16\n1 Soldier (TWAR) 3');
    expect(screen.queryByRole('region', { name: 'Pedine proposte' })).toBeNull();
  });

  it('no longer suggests the token of a card taken out, but keeps a token line already added', async () => {
    const user = await mountPageAndWrite('1 Gold Forger{Enter}1 Raise the Alarm{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Aggiungi Treasure (TSNC 16)' }));
    await screen.findByRole('button', { name: 'Modifica Treasure' });

    const decklist = screen.getByLabelText<HTMLTextAreaElement>('Decklist');
    await user.type(decklist, '{Backspace}', {
      initialSelectionStart: 0,
      initialSelectionEnd: '1 Gold Forger\n1 Raise the Alarm\n'.length,
    });

    expect(decklistValue()).not.toContain('Gold Forger');
    expect(decklistValue()).toContain('1 Treasure (TSNC) 16');
    expect(screen.getByRole('button', { name: 'Modifica Treasure' })).toBeTruthy();
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Aggiungi Soldier (TWAR 3)' })).toBeNull(),
    );
  });

  describe('asked of the server', () => {
    const tokenRequests = () => vi.mocked(api.fetchSuggestedTokens).mock.calls.length;
    const decklist = () => screen.getByLabelText<HTMLTextAreaElement>('Decklist');

    async function untilEveryLineIsResolved() {
      await waitFor(() =>
        expect(screen.queryAllByText('Riconoscimento in corso…')).toHaveLength(0),
      );
    }

    it('asks nothing when a card already in the decklist is written again with the same print', async () => {
      const user = await mountPageAndWrite('1 Gold Forger{Enter}');
      await screen.findByRole('button', { name: 'Aggiungi Treasure (TSNC 16)' });
      const requestsBefore = tokenRequests();

      await user.type(decklist(), '1 Gold Forger{Enter}');
      await untilEveryLineIsResolved();

      expect(tokenRequests()).toBe(requestsBefore);
    });

    it('asks nothing when the quantity of a resolved line changes in the text', async () => {
      const user = await mountPageAndWrite('1 Gold Forger{Enter}1 Raise the Alarm{Enter}');
      await screen.findByRole('button', { name: 'Aggiungi Soldier (TWAR 3)' });
      const requestsBefore = tokenRequests();

      await user.type(decklist(), '3', { initialSelectionStart: 0, initialSelectionEnd: 1 });
      await user.tab();
      await untilEveryLineIsResolved();

      expect(decklistValue()).toBe('3 Gold Forger\n1 Raise the Alarm\n');
      expect(tokenRequests()).toBe(requestsBefore);
    });

    it('asks once, with the new card, when a line is rewritten with another card', async () => {
      const user = await mountPageAndWrite('1 Gold Forger{Enter}4 Sol Ring{Enter}');
      await screen.findByRole('button', { name: 'Aggiungi Treasure (TSNC 16)' });
      const requestsBefore = tokenRequests();

      const solRingLine = {
        start: '1 Gold Forger\n'.length,
        end: '1 Gold Forger\n4 Sol Ring'.length,
      };
      await user.type(decklist(), '1 Raise the Alarm', {
        initialSelectionStart: solRingLine.start,
        initialSelectionEnd: solRingLine.end,
      });
      await user.tab();

      expect(await screen.findByRole('button', { name: 'Aggiungi Soldier (TWAR 3)' })).toBeTruthy();
      const newRequests = vi.mocked(api.fetchSuggestedTokens).mock.calls.slice(requestsBefore);
      expect(newRequests.map(([lines]) => lines.map(({ oracleId }) => oracleId))).toEqual([
        ['gold-forger', 'raise-the-alarm'],
      ]);
    });

    it('still asks nothing when the quantity of a resolved line changes after another line failed to resolve', async () => {
      const user = await mountPageAndWrite('1 Gold Forger{Enter}1 Raise the Alarm{Enter}');
      await screen.findByRole('button', { name: 'Aggiungi Soldier (TWAR 3)' });
      vi.mocked(api.resolveDecklistText).mockRejectedValueOnce(new Error('offline'));
      await user.type(decklist(), '1 Xyzzy Plover{Enter}');
      await screen.findByRole('alert');
      const requestsBefore = tokenRequests();

      await user.type(decklist(), '3', { initialSelectionStart: 0, initialSelectionEnd: 1 });
      await user.tab();
      await untilEveryLineIsResolved();

      expect(decklistValue()).toBe('3 Gold Forger\n1 Raise the Alarm\n1 Xyzzy Plover\n');
      expect(tokenRequests()).toBe(requestsBefore);
    });

    it('no longer holds the last answer once the resolution of a line has failed', async () => {
      const user = await mountPageAndWrite('1 Gold Forger{Enter}');
      await screen.findByRole('button', { name: 'Aggiungi Treasure (TSNC 16)' });
      vi.mocked(api.resolveDecklistText).mockRejectedValue(new Error('offline'));

      await user.type(decklist(), '1 Raise the Alarm', {
        initialSelectionStart: 0,
        initialSelectionEnd: '1 Gold Forger'.length,
      });
      await user.tab();

      await waitFor(() =>
        expect(screen.queryByRole('button', { name: 'Aggiungi Treasure (TSNC 16)' })).toBeNull(),
      );
    });

    it('asks nothing when the decklist is emptied and the same text pasted again', async () => {
      const text = '1 Gold Forger\n1 Raise the Alarm\n';
      const user = await mountPageAndWrite('1 Gold Forger{Enter}1 Raise the Alarm{Enter}');
      await screen.findByRole('button', { name: 'Aggiungi Soldier (TWAR 3)' });
      const requestsBefore = tokenRequests();

      await user.type(decklist(), '{Backspace}', {
        initialSelectionStart: 0,
        initialSelectionEnd: text.length,
      });
      expect(screen.queryByRole('region', { name: 'Pedine proposte' })).toBeNull();
      await user.paste(text);

      expect(await screen.findByRole('button', { name: 'Aggiungi Soldier (TWAR 3)' })).toBeTruthy();
      expect(decklistValue()).toBe(text);
      expect(tokenRequests()).toBe(requestsBefore);
    });

    it('suggests the token of a card added that creates one', async () => {
      const user = await mountPageAndWrite('1 Gold Forger{Enter}');
      await screen.findByRole('button', { name: 'Aggiungi Treasure (TSNC 16)' });

      await user.type(decklist(), '1 Raise the Alarm{Enter}');

      expect(await screen.findByRole('button', { name: 'Aggiungi Soldier (TWAR 3)' })).toBeTruthy();
    });

    it('asks again and suggests the tokens of the print shown when a card moves to another print', async () => {
      const user = await mountPageAndWrite('1 Pia Nalaar{Enter}');
      await user.click(await screen.findByRole('button', { name: 'Modifica Pia Nalaar' }));
      const requestsBefore = tokenRequests();

      await user.click(await waitFor(() => printButtonOf('OLD #1')));

      expect(await screen.findByRole('button', { name: 'Aggiungi Soldier (TWAR 3)' })).toBeTruthy();
      expect(tokenRequests()).toBe(requestsBefore + 1);
    });

    it('asks again when the lines are reordered', async () => {
      const user = await mountPageAndWrite('1 Gold Forger{Enter}1 Raise the Alarm{Enter}');
      await screen.findByRole('button', { name: 'Aggiungi Soldier (TWAR 3)' });
      const requestsBefore = tokenRequests();

      await user.type(decklist(), '{Backspace}', {
        initialSelectionStart: 0,
        initialSelectionEnd: decklistValue().length,
      });
      await user.paste('1 Raise the Alarm\n1 Gold Forger\n');
      await untilEveryLineIsResolved();

      expect(tokenRequests()).toBe(requestsBefore + 1);
    });

    it('asks nothing for the sheet options, blank lines or section headers', async () => {
      const user = await mountPageAndWrite('1 Gold Forger{Enter}');
      await screen.findByRole('button', { name: 'Aggiungi Treasure (TSNC 16)' });
      const requestsBefore = tokenRequests();

      await user.type(decklist(), '{Enter}Sideboard{Enter}');
      await untilEveryLineIsResolved();
      await user.click(centreTab('Foglio'));
      await user.selectOptions(screen.getByLabelText('Formato della pagina'), 'Letter (USA)');

      expect(tokenRequests()).toBe(requestsBefore);
    });

    it('shows no token of an emptied decklist while another decklist resolves', async () => {
      const user = await mountPageAndWrite('1 Gold Forger{Enter}');
      await screen.findByRole('button', { name: 'Aggiungi Treasure (TSNC 16)' });
      await user.type(decklist(), '{Backspace}', {
        initialSelectionStart: 0,
        initialSelectionEnd: decklistValue().length,
      });
      vi.mocked(api.resolveDecklistText).mockReturnValue(new Promise(() => {}));

      await user.paste('1 Raise the Alarm\n');

      expect(screen.getAllByText('Riconoscimento in corso…')).not.toHaveLength(0);
      expect(screen.queryByRole('region', { name: 'Pedine proposte' })).toBeNull();
    });

    it('keeps showing the suggested tokens of the last answer while a line resolves', async () => {
      const user = await mountPageAndWrite('1 Gold Forger{Enter}');
      await screen.findByRole('button', { name: 'Aggiungi Treasure (TSNC 16)' });
      vi.mocked(api.resolveDecklistText).mockReturnValue(new Promise(() => {}));

      await user.type(decklist(), '2', { initialSelectionStart: 0, initialSelectionEnd: 1 });
      await user.tab();

      expect(screen.getAllByText('Riconoscimento in corso…')).not.toHaveLength(0);
      expect(screen.getByRole('button', { name: 'Aggiungi Treasure (TSNC 16)' })).toBeTruthy();
    });

    it('names the cards creating a token as before when a card is written twice, each card once', async () => {
      await mountPageAndWrite('1 Gold Forger{Enter}1 Raise the Alarm{Enter}1 Gold Forger{Enter}');

      const treasure = await screen.findByRole('listitem', { name: 'Treasure' });
      expect(within(treasure).getByText('da Gold Forger')).toBeTruthy();
    });
  });
});

describe('the token lines', () => {
  const tokenPrint = (oracleId: string, set: string, number: string, releasedAt: string) => ({
    ...printOf('Soldier', `${oracleId}-${set}`, set, releasedAt),
    collectorNumber: number,
    layout: 'token',
  });
  /** A white Soldier printed in two token sets, and a red one: three tokens sharing a name. */
  const WHITE_SOLDIER: CatalogEntry = {
    card: aCard({
      oracleId: 'white-soldier',
      name: 'Soldier',
      powerToughnessByFace: [{ power: '1', toughness: '1' }],
      keywords: ['Lifelink'],
    }),
    prints: [
      tokenPrint('white-soldier', 'tfrc', '3', '2021-01-01'),
      tokenPrint('white-soldier', 'twar', '5', '2019-01-01'),
    ],
  };
  const RED_SOLDIER: CatalogEntry = {
    card: aCard({
      oracleId: 'red-soldier',
      name: 'Soldier',
      powerToughnessByFace: [{ power: '2', toughness: '2' }],
      keywords: ['Haste'],
    }),
    prints: [tokenPrint('red-soldier', 'tm20', '2', '2020-01-01')],
  };

  beforeEach(() => {
    Object.entries(inMemoryServer([...CATALOG, WHITE_SOLDIER, RED_SOLDIER])).forEach(
      ([call, answer]) => {
        vi.mocked(api[call as keyof typeof api]).mockImplementation(answer as never);
      },
    );
  });

  /** The Scryfall print id each Soldier tile shows, in the order of the grid. */
  function soldierImages() {
    return within(cardGrid())
      .getAllByRole('img', { name: 'Immagine di Soldier' })
      .map((image) => /\w+-soldier-\w+/.exec(image.getAttribute('src') ?? '')?.[0]);
  }

  /** Adds the Soldier the grid of its versions shows at `index` to the Tokens section. */
  async function addSoldier(user: ReturnType<typeof userEvent.setup>, index: number) {
    const found = await searchToAdd(user, 'Mazzo', 'soldier', 'Token');
    await user.click(await within(found).findByRole('option', { name: /^Soldier: / }));
    const soldier = (await versionGrid()).getAllByRole('button')[index];
    if (!soldier) throw new Error(`no Soldier at ${index}`);
    await user.click(soldier);
  }

  async function versionGrid() {
    return within(await screen.findByRole('list', { name: 'Versioni di Soldier' }));
  }

  it('shows the tokens sharing a name as one search row, which opens all of them', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    const found = await searchToAdd(user, 'Mazzo', 'soldier', 'Token');

    const rows = await within(found).findAllByRole('option');
    expect(rows.map((row) => row.ariaLabel)).toEqual(['Soldier: 2 versioni']);
    await user.click(within(found).getByRole('option', { name: 'Soldier: 2 versioni' }));

    expect((await versionGrid()).getAllByRole('button').map((button) => button.ariaLabel)).toEqual([
      'Soldier, TFRC #3, 1/1 Legame vitale',
      'Soldier, TM20 #2, 2/2 Rapidità',
    ]);
    expect(screen.getByText('Soldier: 2 versioni')).toBeTruthy();
  });

  it('lists every version of a shared name, even past the last card the search shows', async () => {
    const soldiers = Array.from({ length: CARD_SEARCH_LIMIT + 2 }, (_, index) => ({
      card: aCard({ oracleId: `soldier-${index}`, name: 'Soldier' }),
      prints: [tokenPrint(`soldier-${index}`, 'tsld', String(index + 1), '2022-01-01')],
    }));
    Object.entries(inMemoryServer([...CATALOG, ...soldiers])).forEach(([call, answer]) => {
      vi.mocked(api[call as keyof typeof api]).mockImplementation(answer as never);
    });
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    const found = await searchToAdd(user, 'Mazzo', 'soldier', 'Token');

    await user.click(await within(found).findByRole('option', { name: /^Soldier: / }));

    expect((await versionGrid()).getAllByRole('button')).toHaveLength(CARD_SEARCH_LIMIT + 2);
  });

  it('picks a version from the keyboard: Enter opens the grid, whose first version takes the focus', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    const found = await searchToAdd(user, 'Mazzo', 'soldier', 'Token');
    await within(found).findByRole('option', { name: /^Soldier: / });

    await user.keyboard('{Enter}');
    await versionGrid();
    expect(document.activeElement?.ariaLabel).toBe('Soldier, TFRC #3, 1/1 Legame vitale');
    await user.tab();
    await user.keyboard('{Enter}');

    expect(decklistValue()).toBe('4 Sol Ring\n\nTokens\n1 Soldier (TM20) 2');
  });

  it('goes back from the grid of versions to the cards found', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    const found = await searchToAdd(user, 'Mazzo', 'soldier', 'Token');
    await user.click(await within(found).findByRole('option', { name: /^Soldier: / }));
    await versionGrid();

    await user.click(screen.getByRole('button', { name: 'Tutti i risultati' }));

    expect(screen.getByRole('option', { name: 'Soldier: 2 versioni' })).toBeTruthy();
  });

  it('steps through the candidates of a line on its tile, every image loaded at once so none flickers', async () => {
    const user = await mountPageAndWrite('Tokens{Enter}2 Soldier{Enter}');
    const carousel = within(
      await within(cardGrid()).findByRole('group', { name: 'Quale Soldier?' }),
    );
    const images = () =>
      carousel.getAllByRole('presentation').map((image) => image.getAttribute('src'));
    const imagesBefore = images();
    expect(imagesBefore).toHaveLength(2);
    expect(carousel.getByText('1/2')).toBeTruthy();

    await user.click(carousel.getByRole('button', { name: 'Candidato successivo' }));

    expect(carousel.getByText('2/2')).toBeTruthy();
    expect(images()).toEqual(imagesBefore);
    expect(carousel.getByRole('button', { name: /^Scegli Soldier \(/ }).ariaLabel).toBe(
      'Scegli Soldier (TM20 #2, 2/2 Rapidità)',
    );
  });

  it('steps through the candidates of the line to fix with the arrow keys', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}Tokens{Enter}2 Soldier{Enter}');
    await user.click(await summary().findByRole('button', { name: '1 riga da sistemare' }));
    const lineToFix = within(screen.getByRole('complementary', { name: 'Riga da sistemare' }));
    const carousel = lineToFix.getByRole('group', { name: 'Quale Soldier?' });

    await user.click(within(carousel).getByRole('button', { name: 'Candidato successivo' }));
    await user.keyboard('{ArrowLeft}');

    expect(within(carousel).getByText('1/2')).toBeTruthy();
    expect(within(carousel).getByText('1/2: Soldier, TFRC #3, 1/1 Legame vitale')).toBeTruthy();
  });

  it('adds two tokens sharing a name as two lines named by set and number, each tile showing its own', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await addSoldier(user, 0);
    await addSoldier(user, 1);

    expect(decklistValue()).toBe('4 Sol Ring\n\nTokens\n1 Soldier (TFRC) 3\n1 Soldier (TM20) 2');
    expect(soldierImages()).toEqual(['white-soldier-tfrc', 'red-soldier-tm20']);
  });

  it('adds the same token again as one more copy on its line', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await addSoldier(user, 0);
    await addSoldier(user, 0);

    expect(decklistValue()).toBe('4 Sol Ring\n\nTokens\n2 Soldier (TFRC) 3');
  });

  it('rewrites a line written by the name alone with the set and number of the token picked', async () => {
    const user = await mountPageAndWrite('Tokens{Enter}2 Soldier{Enter}');
    await pickCandidate(user, 'Soldier', { version: 'TM20 #2' });

    expect(decklistValue()).toBe('Tokens\n2 Soldier (TM20) 2\n');
    expect(soldierImages()).toEqual(['red-soldier-tm20']);
    const requested = vi.mocked(api.resolveDecklistText).mock.calls.map(([text]) => text);
    expect(requested.filter((text) => text.includes('TM20'))).toEqual([]);
  });

  it('names the print every copy of a token line moves to', async () => {
    const user = await mountPageAndWrite('Tokens{Enter}2 Soldier (TFRC) 3{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Modifica Soldier' }));

    await user.click(await waitFor(() => printButtonOf('TWAR #5')));

    expect(decklistValue()).toBe('Tokens\n2 Soldier (TWAR) 5\n');
    expect(gridTiles().map(tileSummary)).toEqual([['Immagine di Soldier', '2×', undefined]]);
    expect(soldierImages()).toEqual(['white-soldier-twar']);
  });

  it('names the print with the most copies of a token line, and on a tie the one of its first tile', async () => {
    const user = await mountPageAndWrite('Tokens{Enter}3 Soldier (TFRC) 3{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Modifica Soldier' }));

    await moveOneCopy(user, 'Soldier', 'TFRC #3', 'TWAR #5');
    expect(decklistValue()).toBe('Tokens\n3 Soldier (TFRC) 3\n');
    await user.click(await screen.findByRole('button', { name: 'Una copia in più con TWAR #5' }));
    expect(decklistValue()).toBe('Tokens\n4 Soldier (TFRC) 3\n');
    await user.click(
      screen.getByRole('button', { name: 'Una copia in meno di Soldier (TFRC #3)' }),
    );

    expect(decklistValue()).toBe('Tokens\n3 Soldier (TWAR) 5\n');
    expect(gridTiles().map(tileSummary)).toEqual([
      ['Immagine di Soldier', '2×', '1/2'],
      ['Immagine di Soldier', '1×', '2/2'],
    ]);
    expect(soldierImages()).toEqual(['white-soldier-twar', 'white-soldier-tfrc']);
  });

  it('keeps the copies of a rewritten token line on their prints after a reload', async () => {
    const user = await mountPageAndWrite('Tokens{Enter}3 Soldier (TFRC) 3{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Modifica Soldier' }));
    await moveOneCopy(user, 'Soldier', 'TFRC #3', 'TWAR #5');
    await moveOneCopy(user, 'Soldier', 'TFRC #3', 'TWAR #5');
    expect(decklistValue()).toBe('Tokens\n3 Soldier (TWAR) 5\n');

    reload();

    await waitFor(() =>
      expect(gridTiles().map(tileSummary)).toEqual([
        ['Immagine di Soldier', '2×', '1/2'],
        ['Immagine di Soldier', '1×', '2/2'],
      ]),
    );
    expect(decklistValue()).toBe('Tokens\n3 Soldier (TWAR) 5\n');
    expect(soldierImages()).toEqual(['white-soldier-twar', 'white-soldier-tfrc']);
  });

  it('leaves the line of a card that is no token as written when its copies move', async () => {
    const user = await mountPageAndWrite('2 Sol Ring (C21) 1{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Modifica Sol Ring' }));

    await user.click(await waitFor(() => printButtonOf('LEA #1')));

    expect(decklistValue()).toBe('2 Sol Ring (C21) 1\n');
  });
});
