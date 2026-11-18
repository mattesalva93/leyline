import { act, cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../api.ts';
import { mountApp } from '../test-support/mount-app.tsx';
import {
  reload,
  mountPageAndWrite,
  decklistValue,
  answerApiCallsFromCatalog,
} from '../test-support/workspace-page.ts';
import { centreTab } from '../test-support/grid-queries.ts';

vi.mock('../api.ts');

beforeEach(answerApiCallsFromCatalog);

describe('a new decklist', () => {
  it('goes to the landing page once the user confirms, and opens there after a reload', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });
    await user.click(centreTab('Foglio'));
    await user.selectOptions(screen.getByLabelText('Formato della pagina'), 'Letter (USA)');

    await user.click(screen.getByRole('button', { name: 'Nuova decklist' }));
    await user.click(
      within(screen.getByRole('dialog', { name: 'Iniziare una nuova decklist?' })).getByRole(
        'button',
        { name: 'Svuota' },
      ),
    );

    expect(decklistValue()).toBe('');
    expect(screen.getByRole('button', { name: 'Prova con un esempio' })).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Griglia delle carte' })).toBeNull();
    reload();
    expect(decklistValue()).toBe('');
    expect(screen.getByRole('button', { name: 'Prova con un esempio' })).toBeTruthy();
    await user.type(screen.getByLabelText('Decklist'), '4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });
    await user.click(centreTab('Foglio'));
    expect(screen.getByLabelText<HTMLSelectElement>('Formato della pagina').value).toBe('A4');
  });

  /** Starts a new decklist, confirming it. */
  async function startNewDecklist(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: 'Nuova decklist' }));
    await user.click(screen.getByRole('button', { name: 'Svuota' }));
  }

  it('leaves no error of the emptied decklist behind', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });
    vi.mocked(api.resolveDecklistText).mockRejectedValue(new Error('offline'));
    await user.type(screen.getByLabelText('Decklist'), '1 Brainstorm{Enter}');
    await screen.findByRole('alert');

    await startNewDecklist(user);

    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('opens empty after a reload, with no error even while the server is out of reach', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });
    await startNewDecklist(user);
    vi.mocked(api.resolveDecklistText).mockRejectedValue(new Error('offline'));

    cleanup();
    mountApp('/proxy');

    expect(decklistValue()).toBe('');
    await act(() => Promise.resolve());
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('keeps the decklist when the user changes their mind', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });

    await user.click(screen.getByRole('button', { name: 'Nuova decklist' }));
    await user.click(screen.getByRole('button', { name: 'Annulla' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(decklistValue()).toBe('4 Sol Ring\n');
    expect(screen.getByRole('button', { name: 'Modifica Sol Ring' })).toBeTruthy();
  });

  it('is not offered while there is nothing to empty', () => {
    mountApp('/proxy');

    expect(screen.queryByRole('button', { name: 'Nuova decklist' })).toBeNull();
  });
});
