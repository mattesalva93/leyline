import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../api.ts';
import { inMemoryServer } from '../test-support/in-memory-server.ts';
import { mountApp } from '../test-support/mount-app.tsx';
import { AppShell } from './AppShell.tsx';
import type { ShellArea } from './shell-area.ts';

vi.mock('../api.ts');

beforeEach(() => {
  localStorage.clear();
  Object.entries(inMemoryServer([])).forEach(([call, answer]) => {
    vi.mocked(api[call as keyof typeof api]).mockImplementation(answer as never);
  });
});

/** The four areas the spec plans, so the shell is tried with the navigation it must hold. */
const FOUR_AREAS: readonly ShellArea[] = [
  { path: '/proxy', label: 'Generatore' },
  { path: '/analisi', label: 'Analisi mazzo' },
  { path: '/assistente', label: 'Assistente AI' },
  { path: '/notizie', label: 'Notizie ed eventi' },
];

function mountShellWithFourAreas() {
  const router = createMemoryRouter(
    [
      {
        element: <AppShell areas={FOUR_AREAS} />,
        children: FOUR_AREAS.map(({ path, label }) => ({ path, element: <h1>{label}</h1> })),
      },
    ],
    { initialEntries: ['/proxy'] },
  );
  render(<RouterProvider router={router} />);
  return { router, user: userEvent.setup() };
}

function linkNames(container: HTMLElement): string[] {
  return within(container)
    .getAllByRole('link')
    .map((link) => link.textContent ?? '');
}

describe('the app shell', () => {
  it('links only to the areas that exist: today the generator', async () => {
    mountApp('/proxy');
    await screen.findByRole('textbox', { name: 'Decklist' });

    expect(linkNames(screen.getByRole('navigation', { name: 'Aree' }))).toEqual(['Generatore']);
  });

  it('lists four areas in the top bar, in order, and marks the current one', () => {
    mountShellWithFourAreas();

    const nav = screen.getByRole('navigation', { name: 'Aree' });
    expect(linkNames(nav)).toEqual(FOUR_AREAS.map((area) => area.label));
    expect(within(nav).getByRole('link', { current: 'page' }).textContent).toBe('Generatore');
  });

  it('opens the areas from the menu button too, as a phone shows them', async () => {
    const { router, user } = mountShellWithFourAreas();

    await user.click(screen.getByRole('button', { name: 'Menu' }));
    const menu = screen.getByRole('dialog', { name: 'Menu' });
    expect(linkNames(menu)).toEqual(FOUR_AREAS.map((area) => area.label));

    await user.click(within(menu).getByRole('link', { name: 'Notizie ed eventi' }));

    expect(router.state.location.pathname).toBe('/notizie');
    expect(screen.queryByRole('dialog', { name: 'Menu' })).toBeNull();
  });

  it('opens and closes the menu from the keyboard, giving the focus back', async () => {
    const { user } = mountShellWithFourAreas();
    const menuButton = screen.getByRole('button', { name: 'Menu' });
    menuButton.focus();

    await user.keyboard('{Enter}');
    expect(screen.getByRole('dialog', { name: 'Menu' })).toBeTruthy();
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog', { name: 'Menu' })).toBeNull();
    expect(document.activeElement).toBe(menuButton);
  });

  it('credits Scryfall on the generator screen, with no footer below it', async () => {
    mountApp('/proxy');
    await screen.findByRole('textbox', { name: 'Decklist' });

    expect(screen.getByRole('link', { name: 'Scryfall' }).getAttribute('href')).toBe(
      'https://scryfall.com',
    );
    expect(screen.queryByRole('contentinfo')).toBeNull();
  });

  describe('"Informazioni"', () => {
    function expectTheInformation(dialog: HTMLElement) {
      expect(
        within(dialog).getByText('Progetto non ufficiale, non affiliato a Wizards of the Coast.'),
      ).toBeTruthy();
      expect(
        within(dialog).getByRole('link', { name: 'Segnala un problema' }).getAttribute('href'),
      ).toBe('https://github.com/mattesalva93/mtg-suite/issues');
    }

    it('shows the disclaimer and the link to report a problem, from the top bar', async () => {
      const { user } = mountShellWithFourAreas();

      await user.click(screen.getByRole('button', { name: 'Informazioni' }));

      expectTheInformation(screen.getByRole('dialog', { name: 'Informazioni' }));
    });

    it('opens from the phone menu too, closing the menu', async () => {
      const { user } = mountShellWithFourAreas();
      await user.click(screen.getByRole('button', { name: 'Menu' }));

      await user.click(
        within(screen.getByRole('dialog', { name: 'Menu' })).getByRole('button', {
          name: 'Informazioni',
        }),
      );

      expectTheInformation(screen.getByRole('dialog', { name: 'Informazioni' }));
      expect(screen.queryByRole('dialog', { name: 'Menu' })).toBeNull();
    });

    it('closes from the keyboard, giving the focus back', async () => {
      const { user } = mountShellWithFourAreas();
      const infoButton = screen.getByRole('button', { name: 'Informazioni' });
      infoButton.focus();

      await user.keyboard('{Enter}');
      expect(screen.getByRole('dialog', { name: 'Informazioni' })).toBeTruthy();
      await user.keyboard('{Escape}');

      expect(screen.queryByRole('dialog', { name: 'Informazioni' })).toBeNull();
      expect(document.activeElement).toBe(infoButton);
    });
  });

  describe('"Informativa privacy"', () => {
    async function openThePrivacyNotice() {
      mountApp('/proxy');
      await screen.findByRole('textbox', { name: 'Decklist' });
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: 'Informazioni' }));
      await user.click(
        within(screen.getByRole('dialog', { name: 'Informazioni' })).getByRole('button', {
          name: 'Informativa privacy',
        }),
      );
      return { user, notice: screen.getByRole('dialog', { name: 'Informativa privacy' }) };
    }

    it('opens from "Informazioni" and names who to write to', async () => {
      const { notice } = await openThePrivacyNotice();

      const contacts = within(notice).getAllByRole('link', {
        name: 'salvalaggiomatteo93@gmail.com',
      });
      expect(contacts.map((link) => link.getAttribute('href'))).toEqual(
        contacts.map(() => 'mailto:salvalaggiomatteo93@gmail.com'),
      );
    });

    it('links to Scryfall’s own notice and to the Garante, by their words', async () => {
      const { notice } = await openThePrivacyNotice();

      expect(within(notice).getByRole('link', { name: 'informativa' }).getAttribute('href')).toBe(
        'https://scryfall.com/docs/privacy',
      );
      expect(
        within(notice).getByRole('link', { name: 'garanteprivacy.it' }).getAttribute('href'),
      ).toBe('https://www.garanteprivacy.it');
    });

    it('covers every point a privacy notice owes the testers', async () => {
      const { notice } = await openThePrivacyNotice();

      expect(
        within(notice)
          .getAllByRole('heading', { level: 3 })
          .map((heading) => heading.textContent),
      ).toEqual([
        'Titolare del trattamento',
        'Finalità e base giuridica',
        'Dati trattati',
        'Destinatari',
        'Dati sul tuo dispositivo',
        'Cosa non c’è',
        'I tuoi diritti',
      ]);
    });

    it('closes back to "Informazioni", giving the focus back', async () => {
      const { user } = await openThePrivacyNotice();

      await user.keyboard('{Escape}');

      expect(screen.queryByRole('dialog', { name: 'Informativa privacy' })).toBeNull();
      expect(document.activeElement).toBe(
        within(screen.getByRole('dialog', { name: 'Informazioni' })).getByRole('button', {
          name: 'Informativa privacy',
        }),
      );
    });
  });

  describe('theme', () => {
    const isDark = () => document.documentElement.classList.contains('dark');

    /** Makes the operating system ask for a dark theme, as `prefers-color-scheme` reports it. */
    function systemPrefersDark() {
      const lightOnly = window.matchMedia;
      vi.spyOn(window, 'matchMedia').mockImplementation((query) =>
        query === '(prefers-color-scheme: dark)'
          ? ({ ...lightOnly(query), matches: true } as MediaQueryList)
          : lightOnly(query),
      );
    }

    beforeEach(() => {
      document.documentElement.classList.remove('dark');
      vi.restoreAllMocks();
    });

    it('follows the system on a first visit', () => {
      systemPrefersDark();
      mountShellWithFourAreas();

      expect(isDark()).toBe(true);
      expect(screen.getByRole('button', { name: 'Passa al tema chiaro' })).toBeTruthy();
    });

    it('switches theme from the top bar and keeps the choice after a reload', async () => {
      const { user } = mountShellWithFourAreas();
      expect(isDark()).toBe(false);

      await user.click(screen.getByRole('button', { name: 'Passa al tema scuro' }));
      expect(isDark()).toBe(true);

      cleanup();
      document.documentElement.classList.remove('dark');
      mountShellWithFourAreas();

      expect(isDark()).toBe(true);
    });

    it('switches theme from the phone menu too', async () => {
      const { user } = mountShellWithFourAreas();
      await user.click(screen.getByRole('button', { name: 'Menu' }));

      await user.click(
        within(screen.getByRole('dialog', { name: 'Menu' })).getByRole('button', {
          name: 'Passa al tema scuro',
        }),
      );

      expect(isDark()).toBe(true);
    });

    it('still starts when the device keeps nothing', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });

      mountShellWithFourAreas();

      expect(screen.getByRole('button', { name: 'Passa al tema scuro' })).toBeTruthy();
    });
  });

  it('takes the main address to the generator, at /proxy', async () => {
    const router = mountApp('/');

    expect(await screen.findByRole('textbox', { name: 'Decklist' })).toBeTruthy();
    expect(router.state.location.pathname).toBe('/proxy');
    expect(screen.getByRole('link', { name: 'Generatore', current: 'page' })).toBeTruthy();
  });
});
