import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../api.ts';
import { inMemoryServer } from '../test-support/in-memory-server.ts';
import { mountApp } from '../test-support/mount-app.tsx';
import { PRIMARY_BUTTON } from '../ui/board-styles.ts';
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

  describe('"Guida"', () => {
    const isGuidedStepShown = () =>
      screen.queryByRole('status', { name: 'Passo guidato' }) !== null;

    it('switches the guide off and starts it over from its menu in the top bar, by keyboard', async () => {
      const user = userEvent.setup();
      mountApp('/proxy');
      const guideMenuButton = screen.getByRole('button', { name: 'Guida · sì' });
      guideMenuButton.focus();

      await user.keyboard('{Enter}');
      const showGuidedSteps = screen.getByRole('menuitemcheckbox', {
        name: 'Mostra i passi guidati',
      });
      expect(document.activeElement).toBe(showGuidedSteps);
      await user.keyboard(' ');
      expect(showGuidedSteps.getAttribute('aria-checked')).toBe('false');
      expect(guideMenuButton.textContent).toBe('Guida · no');
      await user.keyboard('{ArrowDown}');
      expect(document.activeElement).toBe(
        screen.getByRole('menuitem', { name: 'Ricomincia dal primo passo' }),
      );
      await user.keyboard('{Enter}');

      expect(screen.queryByRole('menu')).toBeNull();
      expect(document.activeElement).toBe(guideMenuButton);
      expect(guideMenuButton.textContent).toBe('Guida · sì');
      expect(isGuidedStepShown()).toBe(true);
    });

    it('closes its menu on Escape, giving the focus back to its button', async () => {
      const user = userEvent.setup();
      mountApp('/proxy');
      const guideMenuButton = screen.getByRole('button', { name: 'Guida · sì' });
      await user.click(guideMenuButton);

      await user.keyboard('{Escape}');

      expect(screen.queryByRole('menu')).toBeNull();
      expect(document.activeElement).toBe(guideMenuButton);
    });

    it('switches the guide off and starts it over from the phone menu, closing it', async () => {
      const user = userEvent.setup();
      mountApp('/proxy');
      const menuButton = screen.getByRole('button', { name: 'Menu' });
      const guideItems = () =>
        within(screen.getByRole('dialog', { name: 'Menu' })).getByRole('group', {
          name: 'Guida',
        });

      await user.click(menuButton);
      await user.click(
        within(guideItems()).getByRole('checkbox', { name: 'Mostra i passi guidati' }),
      );
      expect(screen.queryByRole('dialog', { name: 'Menu' })).toBeNull();
      expect(isGuidedStepShown()).toBe(false);
      await user.click(menuButton);
      expect(
        within(guideItems())
          .getByRole('checkbox', { name: 'Mostra i passi guidati' })
          .getAttribute('aria-checked'),
      ).toBe('false');
      await user.click(
        within(guideItems()).getByRole('button', { name: 'Ricomincia dal primo passo' }),
      );

      expect(screen.queryByRole('dialog', { name: 'Menu' })).toBeNull();
      expect(isGuidedStepShown()).toBe(true);
    });
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

    it('styles its close button as the primary action', async () => {
      const { user } = mountShellWithFourAreas();
      await user.click(screen.getByRole('button', { name: 'Informazioni' }));
      const dialog = screen.getByRole('dialog', { name: 'Informazioni' });

      expect(within(dialog).getByRole('button', { name: 'Chiudi' }).className).toContain(
        PRIMARY_BUTTON,
      );
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
        name: 'mtgsuite@proton.me',
      });
      expect(contacts.map((link) => link.getAttribute('href'))).toEqual(
        contacts.map(() => 'mailto:mtgsuite@proton.me'),
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

    it('leaves the theme out of what the device keeps: the app has one (ADR 0020)', async () => {
      const { notice } = await openThePrivacyNotice();

      const deviceSection = within(notice).getByRole('heading', {
        name: 'Dati sul tuo dispositivo',
      }).parentElement;
      expect(deviceSection?.textContent).toContain('la lingua delle carte');
      expect(deviceSection?.textContent).not.toMatch(/\btema\b/);
    });

    it('names the guide switched on or off and its steps done or skipped among what the device keeps', async () => {
      const { notice } = await openThePrivacyNotice();

      const deviceSection = within(notice).getByRole('heading', {
        name: 'Dati sul tuo dispositivo',
      }).parentElement;
      expect(deviceSection?.textContent).toContain(
        'la guida, se è accesa e quali passi sono già svolti o saltati',
      );
    });

    it('styles its close button as the primary action', async () => {
      const { notice } = await openThePrivacyNotice();

      expect(within(notice).getByRole('button', { name: 'Chiudi' }).className).toContain(
        PRIMARY_BUTTON,
      );
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

  it('offers no theme switch, in the top bar or in the phone menu (ADR 0020)', async () => {
    const { user } = mountShellWithFourAreas();
    expect(screen.queryByRole('button', { name: /\btema\b/ })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Menu' }));

    expect(
      within(screen.getByRole('dialog', { name: 'Menu' })).queryByRole('button', {
        name: /\btema\b/,
      }),
    ).toBeNull();
  });

  it('takes the main address to the generator, at /proxy', async () => {
    const router = mountApp('/');

    expect(await screen.findByRole('textbox', { name: 'Decklist' })).toBeTruthy();
    expect(router.state.location.pathname).toBe('/proxy');
    expect(screen.getByRole('link', { name: 'Generatore', current: 'page' })).toBeTruthy();
  });
});
