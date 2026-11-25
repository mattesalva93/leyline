import { jpegOfSize } from '@leyline/core/test-fixtures';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../api.ts';
import { mountApp } from '../test-support/mount-app.tsx';
import { centreTab } from '../test-support/grid-queries.ts';
import { answerApiCallsFromCatalog, mountPageAndWrite } from '../test-support/workspace-page.ts';
import { PRODUCT_EVENTS_PATH } from './product-events-path.ts';

vi.mock('../api.ts');

const WEBSITE_ID = '5f0d1c2e-7a3b-4c4d-9e8f-0a1b2c3d4e5f';

const DECKLIST = '4 Sol Ring\n2 Nonexistent Card\n1 Lightning Bolt\n';

let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

beforeEach(() => {
  answerApiCallsFromCatalog();
  // Images the PDF writer can read, so the PDF gets made.
  vi.mocked(api.fetchImages).mockImplementation(async (urls) => ({
    images: new Map(urls.map((url) => [url, jpegOfSize(745, 1040)])),
    failedUrls: [],
  }));
  fetchMock = vi.fn<typeof fetch>(async () => new Response('{}'));
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('VITE_UMAMI_WEBSITE_ID', WEBSITE_ID);
  // jsdom makes no object URL, which the PDF's download needs.
  vi.stubGlobal(
    'URL',
    Object.assign(URL, { createObjectURL: () => 'blob:pdf', revokeObjectURL: () => {} }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

/** The requests the page sent to the product events path, each as its options and parsed body. */
function sentEvents() {
  return fetchMock.mock.calls
    .filter(([url]) => url === PRODUCT_EVENTS_PATH)
    .map(([, init]) => ({ init, body: JSON.parse(String(init?.body)) as Record<string, unknown> }));
}

/** Pastes the decklist, then makes its PDF from the sheet. */
async function pasteAndMakePdf() {
  const user = await mountPageAndPaste(DECKLIST);
  await user.click(centreTab('Foglio'));
  await user.click(await screen.findByRole('button', { name: 'Scarica il PDF' }));
  return user;
}

/** Mounts the generator page and pastes `decklistText` into the empty decklist. */
async function mountPageAndPaste(decklistText: string) {
  const user = userEvent.setup();
  mountApp('/proxy');
  await user.click(screen.getByLabelText('Decklist'));
  await user.paste(decklistText);
  await screen.findByRole('button', { name: 'Modifica Lightning Bolt' });
  return user;
}

describe('product events (ADR 0027)', () => {
  it('sends one decklist_resolved once a pasted decklist is resolved, with its counts alone', async () => {
    await mountPageAndPaste(DECKLIST);

    await vi.waitFor(() => expect(sentEvents()).toHaveLength(1));
    expect(sentEvents()[0]?.body).toEqual({
      type: 'event',
      payload: {
        website: WEBSITE_ID,
        url: '/',
        name: 'decklist_resolved',
        data: { lineCount: 3, unrecognisedLineCount: 1, lang: 'it' },
      },
    });
  });

  it('sends pdf_generated once the PDF is ready, with its page format, pages and cards', async () => {
    const user = await mountPageAndPaste(DECKLIST);
    await user.click(centreTab('Foglio'));

    await user.click(await screen.findByRole('button', { name: 'Scarica il PDF' }));

    await waitFor(() =>
      expect(sentEvents().map(({ body }) => body.payload)).toContainEqual({
        website: WEBSITE_ID,
        url: '/',
        name: 'pdf_generated',
        data: { pageFormat: 'A4', pageCount: 1, cardCount: 5 },
      }),
    );
  });

  it('sends nothing of what the user wrote: no decklist text, no card name', async () => {
    await pasteAndMakePdf();
    await waitFor(() => expect(sentEvents()).toHaveLength(2));

    const bodies = sentEvents().map(({ init }) => String(init?.body));
    for (const written of ['Sol Ring', 'Nonexistent', 'Lightning Bolt']) {
      expect(bodies.join('\n')).not.toContain(written);
    }
  });

  it('sends no referrer, no cookie and no page address with an event', async () => {
    await mountPageAndPaste(DECKLIST);
    await waitFor(() => expect(sentEvents()).toHaveLength(1));

    expect(sentEvents()[0]?.init).toMatchObject({
      method: 'POST',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
    expect(sentEvents()[0]?.body.payload).not.toHaveProperty('referrer');
  });

  it('sends one decklist_resolved however many lines the pasted decklist resolves', async () => {
    const user = await mountPageAndPaste(DECKLIST);
    await waitFor(() => expect(sentEvents()).toHaveLength(1));

    await user.click(screen.getByRole('button', { name: 'Modifica Sol Ring' }));

    expect(sentEvents()).toHaveLength(1);
  });

  it('sends no decklist_resolved for lines written by hand, one by one', async () => {
    await mountPageAndWrite('4 Sol Ring{Enter}1 Lightning Bolt{Enter}');
    await screen.findByRole('button', { name: 'Modifica Lightning Bolt' });

    expect(sentEvents()).toEqual([]);
  });

  it('sends decklist_resolved for the example decklist, once it is resolved', async () => {
    const user = userEvent.setup();
    mountApp('/proxy');

    await user.click(screen.getByRole('button', { name: 'Prova con un esempio' }));

    await waitFor(() =>
      expect(sentEvents().map(({ body }) => body.payload)).toEqual([
        expect.objectContaining({ name: 'decklist_resolved' }),
      ]),
    );
  });

  it('sends nothing to the events path while the build has no website id', async () => {
    vi.stubEnv('VITE_UMAMI_WEBSITE_ID', '');

    await pasteAndMakePdf();
    await screen.findByRole('button', { name: 'Scarica il PDF' });
    await waitFor(() => expect(api.fetchImages).toHaveBeenCalled());

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows no error and keeps the generator going when an event fails to leave', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const user = await pasteAndMakePdf();
    await waitFor(() => expect(sentEvents()).toHaveLength(2));

    expect(screen.queryByRole('alert')).toBeNull();
    const pdfButton = screen.getByRole<HTMLButtonElement>('button', { name: 'Scarica il PDF' });
    await waitFor(() => expect(pdfButton.disabled).toBe(false));
    await user.click(pdfButton);
    await waitFor(() => expect(sentEvents()).toHaveLength(3));
  });
});
