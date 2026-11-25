import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountApp } from '../../test-support/mount-app.tsx';
import { answerApiCallsFromCatalog } from '../../test-support/workspace-page.ts';
import { reloadPage } from './reload-page.ts';

vi.mock('../../api.ts');
vi.mock('./reload-page.ts');

const [bundleMajor = 0] = import.meta.env.APP_VERSION.split('.').map(Number);
/** Releases above the bundle's, whatever the bundle's is. */
const NEXT = `${bundleMajor + 1}.0.0`;
const AFTER_NEXT = `${bundleMajor + 2}.0.0`;

const NEWS = ['Leyline ti invita a ricaricare la pagina.', 'Il PDF ricorda il formato del foglio.'];
const FIXES = ["Il foglio Letter non taglia più l'ultima riga."];

/** What the server answers for `version.json`: a body, a status, or a network error. */
type VersionFileAnswer = { readonly body: string; readonly status?: number } | 'networkError';

const release = (version: string, news = NEWS, fixes = FIXES): VersionFileAnswer => ({
  body: JSON.stringify({ version, news, fixes }),
});

/** Stands in for the server's `version.json`, answering `answer` until told otherwise. */
function serveVersionFile(answer: VersionFileAnswer) {
  let current = answer;
  const stubbedFetch = vi.fn<typeof fetch>(async () => {
    if (current === 'networkError') throw new TypeError('Failed to fetch');
    return new Response(current.body, { status: current.status ?? 200 });
  });
  vi.stubGlobal('fetch', stubbedFetch);
  return {
    fetch: stubbedFetch,
    answer: (next: VersionFileAnswer) => {
      current = next;
    },
  };
}

let visibility: DocumentVisibilityState = 'visible';

/** The user moves to another tab, or back to this one, as the browser tells the page. */
async function setVisibility(state: DocumentVisibilityState) {
  visibility = state;
  await act(async () => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

/** The user leaves the tab and comes back to it. */
async function comeBackToThePage() {
  await setVisibility('hidden');
  await setVisibility('visible');
}

function invite() {
  return screen.queryByRole('status', { name: /^Nuova versione/ });
}

async function mountAppAndWait() {
  mountApp('/proxy');
  await screen.findByRole('textbox', { name: 'Decklist' });
  return userEvent.setup();
}

beforeEach(() => {
  answerApiCallsFromCatalog();
  visibility = 'visible';
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('the invite to reload', () => {
  it('appears when the page comes back to the foreground and a newer release is online', async () => {
    serveVersionFile(release(NEXT));
    await mountAppAndWait();
    expect(invite()).toBeNull();

    await comeBackToThePage();

    expect(await screen.findByRole('status', { name: `Nuova versione · ${NEXT}` })).toBeTruthy();
  });

  it('asks for the version file without the cache, only as the page comes back', async () => {
    const { fetch } = serveVersionFile(release(NEXT));
    await mountAppAndWait();

    await setVisibility('hidden');
    expect(fetch).not.toHaveBeenCalled();
    await setVisibility('visible');

    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0]?.[0]).toBe('/version.json');
    expect(fetch.mock.calls[0]?.[1]).toMatchObject({ cache: 'no-store' });
  });

  it('lists the «Novità» of the new release, and says the work stays', async () => {
    serveVersionFile(release(NEXT));
    await mountAppAndWait();

    await comeBackToThePage();

    const shown = within(await screen.findByRole('status', { name: /^Nuova versione/ }));
    expect(shown.getByText('Novità')).toBeTruthy();
    expect(shown.getAllByRole('listitem').map((item) => item.textContent)).toEqual(NEWS);
    expect(shown.queryByText('Correzioni')).toBeNull();
    expect(
      shown.getByText('Ricaricando la pagina la decklist e le stampe scelte restano.'),
    ).toBeTruthy();
  });

  it('lists the «Correzioni» under their title when the release brings only those', async () => {
    serveVersionFile(release(NEXT, []));
    await mountAppAndWait();

    await comeBackToThePage();

    const shown = within(await screen.findByRole('status', { name: /^Nuova versione/ }));
    expect(shown.getByText('Correzioni')).toBeTruthy();
    expect(shown.getAllByRole('listitem').map((item) => item.textContent)).toEqual(FIXES);
    expect(shown.queryByText('Novità')).toBeNull();
  });

  it('names only the release online, the latest, for a page left open across several', async () => {
    serveVersionFile(release(AFTER_NEXT));
    await mountAppAndWait();

    await comeBackToThePage();

    expect(
      await screen.findByRole('status', { name: `Nuova versione · ${AFTER_NEXT}` }),
    ).toBeTruthy();
  });

  it.each<[string, VersionFileAnswer]>([
    ['the release of the bundle', release(import.meta.env.APP_VERSION)],
    ['an older release, as after a rollback', release('0.0.0')],
    ['a network error', 'networkError'],
    ['a server error', { body: 'Bad gateway', status: 502 }],
    ['a body that is not JSON', { body: '<!doctype html>' }],
    ['a version that is not MAJOR.MINOR.PATCH', release('next')],
    ['no version', { body: JSON.stringify({ news: NEWS, fixes: FIXES }) }],
    ['changes that are not lists of text', { body: JSON.stringify({ version: NEXT, news: 'x' }) }],
  ])('does not appear, and shows no error, for %s', async (_case, answer) => {
    serveVersionFile(answer);
    await mountAppAndWait();

    await comeBackToThePage();

    expect(invite()).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('never reloads the page on its own, only from «Ricarica»', async () => {
    serveVersionFile(release(NEXT));
    const user = await mountAppAndWait();
    await comeBackToThePage();
    await comeBackToThePage();
    await screen.findByRole('status', { name: /^Nuova versione/ });
    expect(reloadPage).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Ricarica' }));

    expect(reloadPage).toHaveBeenCalledOnce();
  });

  it.each(['Chiudi', 'Più tardi'])(
    'closed by «%s», stays closed for the same release and comes back for a newer one',
    async (closeButton) => {
      const versionFile = serveVersionFile(release(NEXT));
      const user = await mountAppAndWait();
      await comeBackToThePage();
      const shown = await screen.findByRole('status', { name: /^Nuova versione/ });

      await user.click(within(shown).getByRole('button', { name: closeButton }));
      expect(invite()).toBeNull();
      await comeBackToThePage();
      expect(invite()).toBeNull();

      versionFile.answer(release(AFTER_NEXT));
      await comeBackToThePage();

      expect(
        await screen.findByRole('status', { name: `Nuova versione · ${AFTER_NEXT}` }),
      ).toBeTruthy();
      expect(reloadPage).not.toHaveBeenCalled();
    },
  );

  it('keeps what it was closed for out of the device storage', async () => {
    serveVersionFile(release(NEXT));
    const user = await mountAppAndWait();
    await comeBackToThePage();
    const before = { ...localStorage };

    await user.click(await screen.findByRole('button', { name: 'Più tardi' }));

    expect({ ...localStorage }).toEqual(before);
  });
});
