import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { animateRadixParts, endExitAnimationsWithin } from '../../test-support/exit-animations.ts';
import { mountApp } from '../../test-support/mount-app.tsx';
import { mountPageAndWrite, answerApiCallsFromCatalog } from '../../test-support/workspace-page.ts';

vi.mock('../../api.ts');

beforeEach(answerApiCallsFromCatalog);

describe('the side panels on a wide screen', () => {
  it('folds the decklist panel down to a strip with its title from the tab on its edge, and opens it again', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });
    const decklist = screen.getByRole('textbox', { name: 'Decklist' });

    await user.click(screen.getByRole('button', { name: 'Richiudi il pannello «Lista»' }));

    const strip = screen.getByRole('region', { name: 'Lista' });
    expect(within(strip).getByRole('heading', { name: 'Lista' })).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: 'Decklist' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Riapri il pannello «Lista»' }));

    expect(screen.getByRole('textbox', { name: 'Decklist' })).toBe(decklist);
  });

  it('keeps a folding panel as wide as it was, its content in sight, until the content has slid away', async () => {
    animateRadixParts();
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });
    const panel = screen.getByRole('region', { name: 'Lista' });
    const openWidth = panel.style.width;

    await user.click(screen.getByRole('button', { name: 'Richiudi il pannello «Lista»' }));

    expect(panel.style.width).toBe(openWidth);
    expect(screen.getByRole('textbox', { name: 'Decklist' })).toBeTruthy();
    act(() => endExitAnimationsWithin(panel));
    expect(panel.style.width).toBe('');
    expect(screen.queryByRole('textbox', { name: 'Decklist' })).toBeNull();
  });

  it('folds the inspector down to a strip with the title of what it shows', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });

    await user.click(screen.getByRole('button', { name: 'Richiudi il pannello «Riepilogo»' }));

    const strip = screen.getByRole('complementary', { name: 'Riepilogo' });
    expect(within(strip).getByRole('heading', { name: 'Riepilogo' })).toBeTruthy();
    expect(screen.queryByRole('group', { name: 'Lingua delle carte' })).toBeNull();
  });

  it('has the tab on its edge as the only control that folds a panel', async () => {
    await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });

    expect(
      screen.getAllByRole('button', { name: /^Richiudi il pannello/ }).map((tab) => tab.title),
    ).toEqual(['Richiudi il pannello «Lista»', 'Richiudi il pannello «Riepilogo»']);
  });

  it('widens and narrows a panel from the keyboard on its edge, its edge moving the way the arrow points', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });
    const decklistEdge = screen.getByRole('separator', { name: 'Allarga o stringi «Lista»' });
    const inspectorEdge = screen.getByRole('separator', { name: 'Allarga o stringi «Riepilogo»' });

    decklistEdge.focus();
    await user.keyboard('{ArrowRight}{ArrowRight}');
    inspectorEdge.focus();
    await user.keyboard('{ArrowLeft}');

    expect(decklistEdge.getAttribute('aria-valuenow')).toBe('280');
    expect(screen.getByRole('region', { name: 'Lista' }).style.width).toBe('280px');
    expect(inspectorEdge.getAttribute('aria-valuenow')).toBe('360');
    expect(screen.getByRole('complementary', { name: 'Riepilogo' }).style.width).toBe('360px');
  });

  it('keeps a panel between its narrowest and its widest, leaving the grid room', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });
    const edge = screen.getByRole('separator', { name: 'Allarga o stringi «Lista»' });
    expect([edge.getAttribute('aria-valuemin'), edge.getAttribute('aria-valuemax')]).toEqual([
      '190',
      '420',
    ]);

    edge.focus();
    await user.keyboard('{End}{ArrowRight}');
    expect(edge.getAttribute('aria-valuenow')).toBe('420');

    await user.keyboard('{Home}{ArrowLeft}');
    expect(edge.getAttribute('aria-valuenow')).toBe('190');
  });

  it('follows the pointer dragging its edge, within its widest, until the button is let go', async () => {
    await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });
    const edge = screen.getByRole('separator', { name: 'Allarga o stringi «Riepilogo»' });

    // The edge captures the pointer while it is dragged: every move of the drag reaches it.
    fireEvent.pointerDown(edge, { button: 0, clientX: 900 });
    fireEvent.pointerMove(edge, { clientX: 870 });
    expect(edge.getAttribute('aria-valuenow')).toBe('370');
    fireEvent.pointerMove(edge, { clientX: 500 });
    expect(edge.getAttribute('aria-valuenow')).toBe('520');
    fireEvent.pointerUp(edge);
    fireEvent.pointerMove(edge, { clientX: 950 });

    expect(edge.getAttribute('aria-valuenow')).toBe('520');
  });

  it('lets go of its edge when the browser cancels the drag', async () => {
    await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });
    const edge = screen.getByRole('separator', { name: 'Allarga o stringi «Lista»' });

    fireEvent.pointerDown(edge, { button: 0, clientX: 300 });
    fireEvent.pointerMove(edge, { clientX: 320 });
    fireEvent.pointerCancel(edge);
    fireEvent.pointerMove(edge, { clientX: 400 });

    expect(edge.getAttribute('aria-valuenow')).toBe('260');
  });

  it('comes back after a reload folded or open, and as wide, as the user left it', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });
    screen.getByRole('separator', { name: 'Allarga o stringi «Lista»' }).focus();
    await user.keyboard('{ArrowRight}');
    await user.click(screen.getByRole('button', { name: 'Richiudi il pannello «Riepilogo»' }));
    cleanup();

    mountApp('/proxy');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });

    expect(screen.getByRole('region', { name: 'Lista' }).style.width).toBe('260px');
    expect(screen.getByRole('button', { name: 'Riapri il pannello «Riepilogo»' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Riapri il pannello «Riepilogo»' }));
    expect(screen.getByRole('complementary', { name: 'Riepilogo' }).style.width).toBe('340px');
  });

  it('starts open at its usual width when what the device kept of it cannot be read', async () => {
    localStorage.setItem('leyline.sidePanel.decklist', '{"isOpen": "no", "width": 9000}');
    localStorage.setItem('leyline.sidePanel.inspector', 'not json');
    await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });

    expect(screen.getByRole('region', { name: 'Lista' }).style.width).toBe('240px');
    expect(screen.getByRole('complementary', { name: 'Riepilogo' }).style.width).toBe('340px');
  });

  it('starts open at its usual width when the device kept it in a version it does not know', async () => {
    const otherVersion = '{"version": 99, "isOpen": false, "width": 300}';
    localStorage.setItem('leyline.sidePanel.decklist', otherVersion);
    localStorage.setItem('leyline.sidePanel.inspector', otherVersion);

    await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });

    expect(screen.getByRole('region', { name: 'Lista' }).style.width).toBe('240px');
    expect(screen.getByRole('complementary', { name: 'Riepilogo' }).style.width).toBe('340px');
  });
});

describe('the side panels on a screen with little room', () => {
  /**
   * Makes the centre of the workspace measure `width` CSS px, as a browser's `ResizeObserver`
   * reports it: jsdom lays nothing out.
   */
  function stubCentreWidth(width: number) {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        readonly onResize: ResizeObserverCallback;
        constructor(onResize: ResizeObserverCallback) {
          this.onResize = onResize;
        }
        observe() {
          this.onResize([{ contentRect: { width } } as ResizeObserverEntry], this as never);
        }
        unobserve() {}
        disconnect() {}
      },
    );
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('stops a panel widening where the centre would get narrower than it may', async () => {
    // The centre measures 400px beside the panels at their usual 240px and 340px: the panels
    // have 400 + 240 + 340 - 320 = 660px between them, keeping the centre's narrowest 320px.
    stubCentreWidth(400);
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });
    const decklistEdge = screen.getByRole('separator', { name: 'Allarga o stringi «Lista»' });
    const inspectorEdge = screen.getByRole('separator', { name: 'Allarga o stringi «Riepilogo»' });
    expect(decklistEdge.getAttribute('aria-valuemax')).toBe('320');

    decklistEdge.focus();
    await user.keyboard('{End}{ArrowRight}');

    expect(decklistEdge.getAttribute('aria-valuenow')).toBe('320');
    expect(screen.getByRole('region', { name: 'Lista' }).style.width).toBe('320px');
    expect(inspectorEdge.getAttribute('aria-valuenow')).toBe('340');
    expect(inspectorEdge.getAttribute('aria-valuemax')).toBe('340');
  });

  it('narrows both panels, each by its share of what it can give, when they come back too wide for the screen', async () => {
    localStorage.setItem(
      'leyline.sidePanel.decklist',
      '{"version": 1, "isOpen": true, "width": 420}',
    );
    localStorage.setItem(
      'leyline.sidePanel.inspector',
      '{"version": 1, "isOpen": true, "width": 520}',
    );
    // 100 + 420 + 520 - 320 = 720px for both: 220px too few. The decklist panel can give
    // 420 - 190 = 230px and the inspector 520 - 280 = 240px, so they give 230/470 and 240/470
    // of the 220px: about 108px and 112px.
    stubCentreWidth(100);
    await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });

    expect(
      screen
        .getByRole('separator', { name: 'Allarga o stringi «Lista»' })
        .getAttribute('aria-valuenow'),
    ).toBe('312');
    expect(
      screen
        .getByRole('separator', { name: 'Allarga o stringi «Riepilogo»' })
        .getAttribute('aria-valuenow'),
    ).toBe('407');
  });

  it('gets back its own width on a screen with room for it again', async () => {
    localStorage.setItem(
      'leyline.sidePanel.decklist',
      '{"version": 1, "isOpen": true, "width": 420}',
    );
    stubCentreWidth(100);
    await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });
    cleanup();
    vi.unstubAllGlobals();

    mountApp('/proxy');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });

    expect(screen.getByRole('region', { name: 'Lista' }).style.width).toBe('420px');
  });
});
