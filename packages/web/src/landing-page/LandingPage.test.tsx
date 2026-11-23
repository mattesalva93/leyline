import { cleanup, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../api.ts';
import { inMemoryServer } from '../test-support/in-memory-server.ts';
import { mountApp } from '../test-support/mount-app.tsx';

vi.mock('../api.ts');

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  Object.entries(inMemoryServer([])).forEach(([call, answer]) => {
    vi.mocked(api[call as keyof typeof api]).mockImplementation(answer as never);
  });
});

/** Whether `earlier` comes before `later` in the page, as a reader meets them. */
function comesBefore(earlier: Element, later: Element): boolean {
  return Boolean(earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING);
}

function tutorialSteps(): HTMLElement[] {
  const tutorial = screen.getByRole('region', { name: 'Come funziona' });
  return within(tutorial).getAllByRole('listitem');
}

function screenshotOf(step: HTMLElement): HTMLImageElement {
  return within(step).getByRole<HTMLImageElement>('img');
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

  it('walks through the generator in four steps after that, each a sentence with its screenshot', () => {
    mountApp('/proxy');

    expect(
      comesBefore(
        screen.getByRole('region', { name: 'Cosa sa fare' }),
        screen.getByRole('region', { name: 'Come funziona' }),
      ),
    ).toBe(true);
    expect(tutorialSteps().map((step) => within(step).getByRole('paragraph').textContent)).toEqual([
      'Incolla la lista: la griglia la riconosce riga per riga e segnala quelle da sistemare.',
      'Seleziona una tessera e scegli la stampa: puoi ripartire le copie su stampe diverse.',
      'Imposta il foglio, formato e segni di taglio, e guarda l’anteprima.',
      'Scarica il PDF e stampalo al 100%.',
    ]);
    expect(new Set(tutorialSteps().map((step) => screenshotOf(step).src)).size).toBe(4);
  });

  it('describes each screenshot with an alternative text of its own', () => {
    mountApp('/proxy');

    const descriptions = tutorialSteps().map((step) => screenshotOf(step).alt);
    descriptions.forEach((description) => expect(description).not.toBe(''));
    expect(new Set(descriptions).size).toBe(4);
  });

  it('shows the same screenshots whatever theme the system asks for (ADR 0020)', () => {
    mountApp('/proxy');
    const screenshots = tutorialSteps().map((step) => screenshotOf(step).src);
    cleanup();
    const systemMedia = window.matchMedia;
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query) =>
        ({
          ...systemMedia(query),
          matches: query === '(prefers-color-scheme: dark)',
        }) as MediaQueryList,
    );

    mountApp('/proxy');

    expect(tutorialSteps().map((step) => screenshotOf(step).src)).toEqual(screenshots);
  });
});
