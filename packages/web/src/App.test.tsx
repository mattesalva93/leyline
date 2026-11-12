import type { CatalogEntry } from '@mtg-suite/core';
import { aCard, aPrint } from '@mtg-suite/core/test-fixtures';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from './api.ts';
import { App } from './App.tsx';
import { inMemoryServer } from './in-memory-server.ts';

vi.mock('./api.ts');

function catalogEntry(oracleId: string, name: string): CatalogEntry {
  return {
    card: aCard({ oracleId, name }),
    prints: [aPrint({ id: `${oracleId}-print`, printedName: name })],
  };
}

const CATALOG = [
  catalogEntry('sol-ring', 'Sol Ring'),
  catalogEntry('lightning-bolt', 'Lightning Bolt'),
  catalogEntry('lightning-helix', 'Lightning Helix'),
];

beforeEach(() => {
  localStorage.clear();
  // Every call of `api.ts` is answered in memory: one added later is covered without a new line here.
  Object.entries(inMemoryServer(CATALOG)).forEach(([call, answer]) => {
    vi.mocked(api[call as keyof typeof api]).mockImplementation(answer as never);
  });
});

/** Mounts the generator page and types `decklistText` into the decklist, as a user would. */
async function mountPageAndWrite(decklistText: string) {
  const user = userEvent.setup();
  render(<App />);
  await user.type(screen.getByLabelText('Decklist'), decklistText);
  return user;
}

describe('the generator page', () => {
  it('recognises a line once the user breaks the line', async () => {
    const user = await mountPageAndWrite('4 Sol Ring');
    expect(screen.getByText('Da riconoscere: vai a capo o esci dal campo')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Modifica Sol Ring' })).toBeNull();

    await user.keyboard('{Enter}');

    expect(await screen.findByRole('button', { name: 'Modifica Sol Ring' })).toBeTruthy();
  });

  it('resolves an ambiguous line to the candidate the user picks', async () => {
    const user = await mountPageAndWrite('1 Lightning{Enter}');
    expect(await screen.findByText('Quale carta intendevi?')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Lightning Helix' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Lightning Bolt' }));

    expect(screen.getByRole('button', { name: 'Modifica Lightning Bolt' })).toBeTruthy();
    expect(screen.queryByText('Quale carta intendevi?')).toBeNull();
  });

  it('rewrites the decklist text when the quantity changes in the line panel', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}1 Lightning Bolt');
    await user.click(await screen.findByRole('button', { name: 'Modifica Sol Ring' }));

    await user.click(screen.getByRole('button', { name: 'Una copia in più' }));

    expect(screen.getByLabelText<HTMLTextAreaElement>('Decklist').value).toBe(
      '5 Sol Ring\n1 Lightning Bolt',
    );
  });

  it('keeps the PDF button disabled until every line is resolved', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}1 Lightning Bolt');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });
    const pdfButton = screen.getByRole<HTMLButtonElement>('button', { name: 'Scarica il PDF' });
    expect(pdfButton.disabled).toBe(true);

    await user.keyboard('{Enter}');
    await screen.findByRole('button', { name: 'Modifica Lightning Bolt' });

    expect(pdfButton.disabled).toBe(false);
  });
});
