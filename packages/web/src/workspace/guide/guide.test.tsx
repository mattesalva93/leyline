import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountApp } from '../../test-support/mount-app.tsx';
import { centreTab, printButtonOf } from '../../test-support/grid-queries.ts';
import { PHONE, stubScreen } from '../../test-support/test-screen.ts';
import {
  answerApiCallsFromCatalog,
  mountPageAndWrite,
  reload,
  startNewDecklist,
  stepBar,
} from '../../test-support/workspace-page.ts';

vi.mock('../../api.ts');

beforeEach(answerApiCallsFromCatalog);

const FIRST_STEP_TEXT = 'Incolla o scrivi la decklist, oppure prova un esempio.';
const STEP_TEXT = {
  openLinePanel: 'Apri una carta per vederne quantità e stampe.',
  changePrint: 'Tocca un’altra stampa: le copie della carta passano a quella.',
  fixLine: 'Questa riga va sistemata: scegli la carta giusta o toglila dalla lista.',
  goToSheet: 'Guarda il foglio, come verrà stampato.',
  makePdf: 'Crea il PDF da stampare.',
} as const;

/** The bubble of the guided step on screen. */
function guidedStep() {
  return screen.getByRole('status', { name: 'Passo guidato' });
}

/** Whether the guide shows a guided step. */
function isGuidedStepShown() {
  return screen.queryByRole('status', { name: 'Passo guidato' }) !== null;
}

/** The X of the guided step on screen. */
function skipStepButton() {
  return within(guidedStep()).getByRole('button', { name: 'Salta questo passo' });
}

/** The text of the guided step on screen, once it shows. */
async function shownStepText() {
  const bubble = await screen.findByRole('status', { name: 'Passo guidato' });
  return within(bubble).getByRole('paragraph').textContent;
}

/** Mounts the generator with `decklistText` written and its first tile `cardName` shown. */
async function mountWithTiles(decklistText: string, cardName = 'Sol Ring') {
  const user = await mountPageAndWrite(decklistText);
  await screen.findByRole('button', { name: `Modifica ${cardName}` });
  return user;
}

describe('the guide', () => {
  it('shows its first guided step on the first visit, beside the decklist', () => {
    mountApp('/proxy');

    expect(within(guidedStep()).getByText(FIRST_STEP_TEXT)).toBeTruthy();
  });

  it('tells which step of the guide its bubble is', () => {
    mountApp('/proxy');

    expect(within(guidedStep()).getByText('Guida · 1')).toBeTruthy();
  });

  it('closes its first guided step by itself once the first line is recognised', async () => {
    const user = await mountPageAndWrite('4 Sol Ring');
    expect(isGuidedStepShown()).toBe(true);

    await user.keyboard('{Enter}');

    await waitFor(() => expect(screen.queryByText(FIRST_STEP_TEXT)).toBeNull());
  });

  it('closes its first guided step by itself once the example is loaded', async () => {
    const user = userEvent.setup();
    mountApp('/proxy');

    await user.click(screen.getByRole('button', { name: 'Prova con un esempio' }));

    await waitFor(() => expect(screen.queryByText(FIRST_STEP_TEXT)).toBeNull());
  });

  it('skips a guided step with its X', async () => {
    const user = userEvent.setup();
    mountApp('/proxy');

    await user.click(skipStepButton());

    expect(isGuidedStepShown()).toBe(false);
    expect(screen.getByRole('button', { name: 'Prova con un esempio' })).toBeTruthy();
  });

  it('never shows again a guided step skipped on an earlier visit', async () => {
    const user = userEvent.setup();
    mountApp('/proxy');
    await user.click(skipStepButton());

    reload();

    expect(screen.getByRole('button', { name: 'Prova con un esempio' })).toBeTruthy();
    expect(isGuidedStepShown()).toBe(false);
  });

  it('never shows again a guided step done on an earlier visit, though the decklist was started over', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });
    await startNewDecklist(user);

    reload();

    expect(screen.getByRole('button', { name: 'Prova con un esempio' })).toBeTruthy();
    expect(isGuidedStepShown()).toBe(false);
  });

  it('takes no focus as it opens', () => {
    mountApp('/proxy');

    expect(guidedStep().contains(document.activeElement)).toBe(false);
  });

  it('lets the keyboard reach its X right after the decklist', async () => {
    const user = userEvent.setup();
    mountApp('/proxy');
    await user.click(screen.getByLabelText('Decklist'));

    await user.tab();

    expect(document.activeElement).toBe(skipStepButton());
  });

  it('gives the focus back to the decklist once the keyboard skips the guided step', async () => {
    const user = userEvent.setup();
    mountApp('/proxy');
    await user.click(screen.getByLabelText('Decklist'));
    await user.tab();

    await user.keyboard('{Enter}');

    expect(isGuidedStepShown()).toBe(false);
    expect(document.activeElement).toBe(screen.getByLabelText('Decklist'));
  });

  it('describes the decklist with the guided step beside it, for a screen reader to read out', () => {
    mountApp('/proxy');

    const descriptionId = screen.getByLabelText('Decklist').getAttribute('aria-describedby') ?? '';
    expect(document.getElementById(descriptionId)?.textContent).toBe(FIRST_STEP_TEXT);
  });

  it('comes back with the decklist once its folded panel opens again', async () => {
    const user = userEvent.setup();
    mountApp('/proxy');

    await user.click(screen.getByRole('button', { name: 'Richiudi il pannello «Lista»' }));
    expect(isGuidedStepShown()).toBe(false);
    await user.click(screen.getByRole('button', { name: 'Riapri il pannello «Lista»' }));

    expect(within(guidedStep()).getByText(FIRST_STEP_TEXT)).toBeTruthy();
  });

  describe('after the first step', () => {
    it('points to a tile, to open its line panel', async () => {
      await mountWithTiles('4 Sol Ring{Enter}');

      expect(await shownStepText()).toBe(STEP_TEXT.openLinePanel);
      expect(within(guidedStep()).getByText('Guida · 2')).toBeTruthy();
    });

    it('describes the tile it points to with its guided step', async () => {
      await mountWithTiles('4 Sol Ring{Enter}');

      const tile = screen.getByRole('listitem', { name: /Sol Ring/ });
      const descriptionId = tile.getAttribute('aria-describedby') ?? '';
      expect(document.getElementById(descriptionId)?.textContent).toBe(STEP_TEXT.openLinePanel);
    });

    it('lets the keyboard reach its X right after the tile it points to', async () => {
      const user = await mountWithTiles('4 Sol Ring{Enter}');
      screen.getByRole('listitem', { name: /Sol Ring/ }).focus();

      await user.tab();

      expect(document.activeElement).toBe(skipStepButton());
    });

    it('leaves Escape to the inspector, which gives the focus back to the tile', async () => {
      const user = await mountWithTiles('4 Sol Ring{Enter}');
      const tile = screen.getByRole('listitem', { name: /Sol Ring/ });
      tile.focus();
      await user.keyboard('{Enter}');
      expect(await shownStepText()).toBe(STEP_TEXT.changePrint);

      await user.keyboard('{Escape}');

      expect(document.activeElement).toBe(tile);
    });

    it('points into the print picker once a tile is open', async () => {
      const user = await mountWithTiles('4 Sol Ring{Enter}');

      await user.click(screen.getByRole('button', { name: 'Modifica Sol Ring' }));

      expect(await shownStepText()).toBe(STEP_TEXT.changePrint);
    });

    it('points to the sheet once a print is tapped in the print picker', async () => {
      const user = await mountWithTiles('4 Sol Ring{Enter}');
      await user.click(screen.getByRole('button', { name: 'Modifica Sol Ring' }));

      await user.click(await waitFor(() => printButtonOf('LEA #1')));

      expect(await shownStepText()).toBe(STEP_TEXT.goToSheet);
      const goToSheet = screen.getByRole('button', { name: 'Controlla il foglio →' });
      expect(goToSheet.getAttribute('aria-describedby')).toBeTruthy();
    });

    it('points to the line to fix, when the decklist has one', async () => {
      const user = await mountWithTiles('4 Sol Ring{Enter}2 Nonexistent Card{Enter}');
      await screen.findByText('Carta non trovata');
      await user.click(skipStepButton());
      await user.click(screen.getByRole('button', { name: 'Modifica Sol Ring' }));

      await user.click(await waitFor(skipStepButton));

      expect(await shownStepText()).toBe(STEP_TEXT.fixLine);
      expect(within(guidedStep()).getByText('Guida · 4')).toBeTruthy();
    });

    it('closes the step of the line to fix once the line is fixed', async () => {
      const user = await mountWithTiles('4 Sol Ring{Enter}2 Nonexistent Card{Enter}');
      await screen.findByText('Carta non trovata');
      await user.click(skipStepButton());
      await user.click(screen.getByRole('button', { name: 'Modifica Sol Ring' }));
      await user.click(await waitFor(skipStepButton));

      await user.click(
        screen.getByRole('button', { name: 'Rimuovi 2 Nonexistent Card dalla lista' }),
      );

      expect(await shownStepText()).toBe(STEP_TEXT.goToSheet);
    });

    it('leaves out the step of the line to fix when the decklist has none', async () => {
      const user = await mountWithTiles('4 Sol Ring{Enter}');
      await user.click(skipStepButton());
      await user.click(screen.getByRole('button', { name: 'Modifica Sol Ring' }));

      await user.click(await waitFor(skipStepButton));

      expect(await shownStepText()).toBe(STEP_TEXT.goToSheet);
      expect(within(guidedStep()).getByText('Guida · 4')).toBeTruthy();
    });

    it('stays on the cards once its step that goes to the sheet is skipped', async () => {
      const user = await mountWithTiles('4 Sol Ring{Enter}');
      await user.click(skipStepButton());
      await user.click(screen.getByRole('button', { name: 'Modifica Sol Ring' }));
      await user.click(await waitFor(skipStepButton));

      await user.click(skipStepButton());

      expect(centreTab('Carte').getAttribute('aria-selected')).toBe('true');
      expect(isGuidedStepShown()).toBe(false);
    });

    it('points to the PDF button on the sheet, and ends once the PDF is made', async () => {
      const user = await mountWithTiles('4 Sol Ring{Enter}');
      await user.click(skipStepButton());
      await user.click(screen.getByRole('button', { name: 'Modifica Sol Ring' }));
      await user.click(await waitFor(skipStepButton));

      await user.click(centreTab('Foglio'));
      expect(await shownStepText()).toBe(STEP_TEXT.makePdf);
      await user.click(screen.getByRole('button', { name: 'Scarica il PDF' }));

      await waitFor(() => expect(isGuidedStepShown()).toBe(false));
    });

    it('counts an action taken before its step comes as done', async () => {
      const user = await mountWithTiles('4 Sol Ring{Enter}');
      await user.click(centreTab('Foglio'));
      await user.click(centreTab('Carte'));
      await user.click(skipStepButton());
      await user.click(screen.getByRole('button', { name: 'Modifica Sol Ring' }));

      await user.click(await waitFor(skipStepButton));

      expect(isGuidedStepShown()).toBe(false);
      await user.click(centreTab('Foglio'));
      expect(await shownStepText()).toBe(STEP_TEXT.makePdf);
    });

    it('keeps its steps done and skipped on the device', async () => {
      const user = await mountWithTiles('4 Sol Ring{Enter}');
      await user.click(screen.getByRole('button', { name: 'Modifica Sol Ring' }));
      await user.click(await waitFor(skipStepButton));

      reload();

      await screen.findByRole('button', { name: 'Modifica Sol Ring' });
      expect(await shownStepText()).toBe(STEP_TEXT.goToSheet);
    });
  });

  describe('on a phone', () => {
    beforeEach(() => {
      stubScreen(PHONE);
      return () => vi.unstubAllGlobals();
    });

    it('shows its first guided step on the first visit, beside the decklist of the decklist step', () => {
      mountApp('/proxy');

      expect(within(guidedStep()).getByText(FIRST_STEP_TEXT)).toBeTruthy();
    });

    it('shows each step in the workspace step of its control', async () => {
      const user = await mountPageAndWrite('4 Sol Ring{Enter}');
      await user.click(stepBar().getByRole('button', { name: 'Carte' }));
      expect(await shownStepText()).toBe(STEP_TEXT.openLinePanel);

      await user.click(screen.getByRole('button', { name: 'Modifica Sol Ring' }));
      const linePanel = await screen.findByRole('dialog');
      expect(await shownStepText()).toBe(STEP_TEXT.changePrint);
      expect(linePanel.contains(guidedStep())).toBe(true);
      await user.click(skipStepButton());
      await user.click(within(linePanel).getByRole('button', { name: 'Chiudi' }));

      expect(await shownStepText()).toBe(STEP_TEXT.goToSheet);
      await user.click(stepBar().getByRole('button', { name: 'Foglio' }));
      expect(await shownStepText()).toBe(STEP_TEXT.makePdf);
    });
  });
});
