import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountApp } from '../../test-support/mount-app.tsx';
import { PHONE, stubScreen } from '../../test-support/test-screen.ts';
import {
  answerApiCallsFromCatalog,
  mountPageAndWrite,
  reload,
  startNewDecklist,
} from '../../test-support/workspace-page.ts';

vi.mock('../../api.ts');

beforeEach(answerApiCallsFromCatalog);

const FIRST_STEP_TEXT = 'Incolla o scrivi la decklist, oppure prova un esempio.';

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

describe('the guide', () => {
  it('shows its first guided step on the first visit, beside the decklist', () => {
    mountApp('/proxy');

    expect(within(guidedStep()).getByText(FIRST_STEP_TEXT)).toBeTruthy();
  });

  it('closes its first guided step by itself once the first line is recognised', async () => {
    const user = await mountPageAndWrite('4 Sol Ring');
    expect(isGuidedStepShown()).toBe(true);

    await user.keyboard('{Enter}');

    await waitFor(() => expect(isGuidedStepShown()).toBe(false));
  });

  it('closes its first guided step by itself once the example is loaded', async () => {
    const user = userEvent.setup();
    mountApp('/proxy');

    await user.click(screen.getByRole('button', { name: 'Prova con un esempio' }));

    await waitFor(() => expect(isGuidedStepShown()).toBe(false));
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

  describe('on a phone', () => {
    beforeEach(() => {
      stubScreen(PHONE);
      return () => vi.unstubAllGlobals();
    });

    it('shows its first guided step on the first visit, beside the decklist of the decklist step', () => {
      mountApp('/proxy');

      expect(within(guidedStep()).getByText(FIRST_STEP_TEXT)).toBeTruthy();
    });
  });
});
