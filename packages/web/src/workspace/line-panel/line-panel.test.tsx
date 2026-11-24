import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../../api.ts';
import { PHONE, stubScreen } from '../../test-support/test-screen.ts';
import {
  mountPageAndWrite,
  stepBar,
  decklistValue,
  moveOneCopy,
  answerApiCallsFromCatalog,
} from '../../test-support/workspace-page.ts';
import { printButtonOf, tileAt } from '../../test-support/grid-queries.ts';
import { animateRadixParts, endExitAnimation } from '../../test-support/exit-animations.ts';

vi.mock('../../api.ts');

beforeEach(answerApiCallsFromCatalog);

describe('the copy breakdown in the line panel', () => {
  const inspector = () => within(screen.getByRole('complementary', { name: 'Riga selezionata' }));

  /** Each print of the breakdown as (language, set and number, copies), then the total. */
  function breakdown() {
    const region = within(inspector().getByRole('region', { name: 'Ripartizione delle copie' }));
    return {
      prints: region
        .getAllByRole('listitem')
        .map((item) => [...item.children].map((cell) => cell.textContent)),
      total: region.getByText(/^Totale/).textContent,
    };
  }

  /** The counter of the print `setAndNumber` in the print picker. */
  function counterOf(setAndNumber: string) {
    return inspector()
      .getByRole('group', { name: `Copie con ${setAndNumber}` })
      .querySelector('output')?.textContent;
  }

  it('shows every print the copies use, in both languages, with its copies and the total', async () => {
    const user = await mountPageAndWrite('4 Brainstorm{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Modifica Brainstorm' }));
    await user.click(await screen.findByRole('button', { name: 'Una copia in più con MMQ #1' }));
    await user.click(await inspector().findByRole('radio', { name: 'Inglese (1)' }));
    await user.click(await screen.findByRole('button', { name: 'Una copia in più con C21 #1' }));

    expect(breakdown()).toEqual({
      prints: [
        ['Italiano', 'ICE #1', '4'],
        ['Italiano', 'MMQ #1', '1'],
        ['Inglese', 'C21 #1', '1'],
      ],
      total: 'Totale: 6 copie',
    });
    expect(inspector().getByText('+2 rispetto a 4')).toBeTruthy();
    expect(decklistValue()).toBe('6 Brainstorm\n');
  });

  it("counts on the default print's counter the copies left unallocated", async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Modifica Sol Ring' }));

    await user.click(await screen.findByRole('button', { name: 'Una copia in più con LEA #1' }));

    expect(counterOf('C21 #1')).toBe('4');
    expect(counterOf('LEA #1')).toBe('1');
    expect(inspector().queryByText(/non assegnat/)).toBeNull();
  });

  it('adds a copy to a print and to the line with its plus, even once every copy is allocated, asking the server nothing', async () => {
    const user = await mountPageAndWrite('2 Sol Ring{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Modifica Sol Ring' }));
    await screen.findByRole('group', { name: 'Copie con LEA #1' });
    await user.click(printButtonOf('LEA #1'));
    expect(breakdown().prints).toEqual([['Inglese', 'LEA #1', '2']]);
    const requestsBefore = vi.mocked(api.resolveDecklistText).mock.calls.length;

    await user.click(screen.getByRole('button', { name: 'Una copia in più con LEA #1' }));

    expect(decklistValue()).toBe('3 Sol Ring\n');
    expect(breakdown().prints).toEqual([['Inglese', 'LEA #1', '3']]);
    expect(vi.mocked(api.resolveDecklistText).mock.calls.length).toBe(requestsBefore);
  });

  it('takes a copy off a print and off the line with its minus, but never the last copy of the line', async () => {
    const user = await mountPageAndWrite('2 Sol Ring{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Modifica Sol Ring' }));
    await user.click(await screen.findByRole('button', { name: 'Una copia in più con LEA #1' }));

    await user.click(screen.getByRole('button', { name: 'Una copia in meno con C21 #1' }));
    await user.click(screen.getByRole('button', { name: 'Una copia in meno con C21 #1' }));

    expect(decklistValue()).toBe('1 Sol Ring\n');
    expect(breakdown()).toEqual({ prints: [['Inglese', 'LEA #1', '1']], total: 'Totale: 1 copia' });
    expect(inspector().getByText('−1 rispetto a 2')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Una copia in meno con LEA #1' })).toHaveProperty(
      'disabled',
      true,
    );
  });

  it("moves the selected tile's copies onto a tapped print, the line keeping its quantity", async () => {
    const user = await mountPageAndWrite('3 Sol Ring{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Modifica Sol Ring' }));
    await user.click(await screen.findByRole('button', { name: 'Una copia in più con LEA #1' }));

    await user.click(printButtonOf('LEA #1'));

    expect(decklistValue()).toBe('4 Sol Ring\n');
    expect(breakdown().prints).toEqual([['Inglese', 'LEA #1', '4']]);
  });
});

describe("the alternate name of the tile's print in the line panel", () => {
  const ALTERNATE_NAME_TAG = "nome alt. «Hope's Aero Magic»";

  it("spells out the alternate name of the opened tile's print, and not a sibling's without one", async () => {
    const user = await mountPageAndWrite('2 Cyclonic Rift{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Modifica Cyclonic Rift' }));
    await moveOneCopy(user, 'Cyclonic Rift', 'RTR #35', 'SLD #1869');
    const inspector = () => within(screen.getByRole('complementary', { name: 'Riga selezionata' }));

    await user.click(tileAt(1).getByRole('button', { name: 'Modifica Cyclonic Rift' }));
    const tag = inspector().getByText(ALTERNATE_NAME_TAG);
    expect(tag.title).toBe("Hope's Aero Magic: nome alternativo di Cyclonic Rift");

    await user.click(tileAt(0).getByRole('button', { name: 'Modifica Cyclonic Rift' }));
    expect(inspector().queryByText(ALTERNATE_NAME_TAG)).toBeNull();
  });

  it('spells out the alternate name on a phone too, once the copies move onto its print', async () => {
    stubScreen(PHONE);
    const user = await mountPageAndWrite('1 Cyclonic Rift{Enter}');
    await user.click(stepBar().getByRole('button', { name: 'Carte' }));
    await user.click(await screen.findByRole('button', { name: 'Modifica Cyclonic Rift' }));
    const phonePanel = () => within(screen.getByRole('dialog', { name: 'Riga selezionata' }));
    expect(phonePanel().queryByText(ALTERNATE_NAME_TAG)).toBeNull();

    await phonePanel().findByRole('group', { name: 'Copie con SLD #1869' });
    await user.click(printButtonOf('SLD #1869'));

    expect(phonePanel().getByText(ALTERNATE_NAME_TAG)).toBeTruthy();
  });
});

describe('the line panel on a phone', () => {
  beforeEach(() => {
    stubScreen(PHONE);
  });

  /** Opens the panel of the first tile of `card`, in the "Carte" step. */
  async function openPanelOf(user: ReturnType<typeof userEvent.setup>, card: string) {
    await user.click(stepBar().getByRole('button', { name: 'Carte' }));
    await user.click(await screen.findByRole('button', { name: `Modifica ${card}` }));
    return within(screen.getByRole('dialog', { name: 'Riga selezionata' }));
  }

  it('heads the panel with the card, its name and a button that closes it, and has no other', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    const panel = await openPanelOf(user, 'Sol Ring');

    const header = within(panel.getByRole('banner'));
    expect(header.getByRole('heading', { name: 'Sol Ring' })).toBeTruthy();
    expect(header.getByRole('img', { name: 'Immagine di Sol Ring' })).toBeTruthy();
    expect(panel.queryByRole('button', { name: 'Fatto' })).toBeNull();
    await user.click(header.getByRole('button', { name: 'Chiudi' }));

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('folds the copy breakdown into a line naming each print used, and opens it by hand', async () => {
    const user = await mountPageAndWrite('4 Brainstorm{Enter}');
    const panel = await openPanelOf(user, 'Brainstorm');
    await user.click(await panel.findByRole('button', { name: 'Una copia in più con MMQ #1' }));
    await user.click(panel.getByRole('radio', { name: 'Inglese (1)' }));
    await user.click(await panel.findByRole('button', { name: 'Una copia in più con C21 #1' }));

    const fold = panel.getByRole('button', { name: /^Ripartizione delle copie/ });
    expect(fold.getAttribute('aria-expanded')).toBe('false');
    expect(fold.textContent).toBe(
      'Ripartizione delle copie IT ICE #1 ×4 · IT MMQ #1 ×1 · EN C21 #1 ×1',
    );
    expect(panel.queryByRole('region', { name: 'Ripartizione delle copie' })).toBeNull();
    await user.click(fold);

    const breakdown = within(panel.getByRole('region', { name: 'Ripartizione delle copie' }));
    expect(breakdown.getByText('Totale: 6 copie')).toBeTruthy();
    expect(breakdown.getByText('+2 rispetto a 4')).toBeTruthy();
  });

  it('opens the copy breakdown folded each time the panel opens', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    const panel = await openPanelOf(user, 'Sol Ring');
    await user.click(panel.getByRole('button', { name: /^Ripartizione delle copie/ }));
    await user.click(panel.getByRole('button', { name: 'Chiudi' }));

    await user.click(screen.getByRole('button', { name: 'Modifica Sol Ring' }));

    const reopened = within(screen.getByRole('dialog', { name: 'Riga selezionata' }));
    expect(
      reopened
        .getByRole('button', { name: /^Ripartizione delle copie/ })
        .getAttribute('aria-expanded'),
    ).toBe('false');
  });

  it('names each language of the prints by its code and its prints, one with none not to be picked', async () => {
    const user = await mountPageAndWrite('1 Trinisphere{Enter}');
    const panel = await openPanelOf(user, 'Trinisphere');

    const languages = within(await panel.findByRole('group', { name: 'Lingua delle stampe' }));

    expect(await languages.findByText('IT 0')).toBeTruthy();
    expect(languages.getByText('EN 2')).toBeTruthy();
    expect(languages.getByRole('radio', { name: 'Italiano (0)' })).toHaveProperty('disabled', true);
    expect(languages.getByRole('radio', { name: 'Inglese (2)', checked: true })).toBeTruthy();
  });

  it('picks the language of the prints from the keyboard, as one choice among the languages', async () => {
    const user = await mountPageAndWrite('4 Brainstorm{Enter}');
    const panel = await openPanelOf(user, 'Brainstorm');
    const languages = within(await panel.findByRole('group', { name: 'Lingua delle stampe' }));
    await languages.findByText('IT 2');

    languages.getByRole('radio', { name: 'Italiano (2)', checked: true }).focus();
    await user.keyboard('{ArrowRight}');

    expect(languages.getByRole('radio', { name: 'Inglese (1)', checked: true })).toBeTruthy();
    expect(await panel.findByRole('group', { name: 'Copie con C21 #1' })).toBeTruthy();
  });

  it('keeps showing the line while it slides away, then leaves the page', async () => {
    animateRadixParts();
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await openPanelOf(user, 'Sol Ring');
    const closingPanel = screen.getByRole('dialog', { name: 'Riga selezionata' });

    await user.click(within(closingPanel).getByRole('button', { name: 'Chiudi' }));

    expect(closingPanel.isConnected).toBe(true);
    expect(within(closingPanel).getByRole('heading', { name: 'Sol Ring' })).toBeTruthy();
    act(() => endExitAnimation(closingPanel));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('heads the panel of a line to fix with its title and a button that closes it', async () => {
    const user = await mountPageAndWrite('2 Nonexistent Card{Enter}');
    await user.click(await screen.findByRole('button', { name: '1 riga da sistemare' }));
    const panel = within(screen.getByRole('dialog', { name: 'Riga da sistemare' }));

    const header = within(panel.getByRole('banner'));
    expect(header.getByRole('heading', { name: 'Riga da sistemare' })).toBeTruthy();
    await user.click(header.getByRole('button', { name: 'Chiudi' }));

    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
