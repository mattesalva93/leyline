import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../api.ts';
import { inMemoryServer } from '../in-memory-server.ts';
import { mountApp } from '../mount-app.tsx';

vi.mock('../api.ts');

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('dark');
  Object.entries(inMemoryServer([])).forEach(([call, answer]) => {
    vi.mocked(api[call as keyof typeof api]).mockImplementation(answer as never);
  });
});

/** Whether `earlier` comes before `later` in the page, as a reader meets them. */
function comesBefore(earlier: Element, later: Element): boolean {
  return Boolean(earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING);
}

describe('the landing page under its start', () => {
  it('lists what the generator can do, after the decklist text, the language and the example button', () => {
    mountApp('/proxy');

    const features = screen.getByRole('region', { name: 'Cosa sa fare' });
    expect(
      within(features)
        .getAllByRole('listitem')
        .map((feature) => feature.textContent),
    ).toEqual([
      'Riconosce i nomi delle carte anche scritti male.',
      'Scegli stampa e lingua, italiano o inglese, per ogni riga.',
      'Foglio A4 o Letter, con i segni di taglio.',
      'Il PDF viene creato nel tuo browser.',
    ]);
    [
      screen.getByLabelText('Decklist'),
      screen.getByRole('group', { name: 'Lingua delle carte' }),
      screen.getByRole('button', { name: 'Prova con un esempio' }),
    ].forEach((startControl) => expect(comesBefore(startControl, features)).toBe(true));
  });
});
