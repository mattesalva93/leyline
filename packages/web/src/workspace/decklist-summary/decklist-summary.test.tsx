import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  mountPageAndWrite,
  pickCandidate,
  summary,
  answerApiCallsFromCatalog,
} from '../../test-support/workspace-page.ts';
import { gridTiles, tileAt, ringColoursOf } from '../../test-support/grid-queries.ts';

vi.mock('../../api.ts');

beforeEach(answerApiCallsFromCatalog);

/** The value the summary gives next to `term`. */
function summaryValue(term: string) {
  return summary().getByText(term, { selector: 'dt' }).nextElementSibling?.textContent;
}

describe('the decklist summary', () => {
  it('counts the cards, the pages and the lines to fix while no tile is selected', async () => {
    // Nine cards fill an A4 page; the last line, still to recognise, is a line to fix too.
    await mountPageAndWrite('9 Sol Ring{Enter}2 Nonexistent Card{Enter}1 Lightning{Enter}1 Sol');
    await screen.findByText('Carta non trovata');

    expect(summaryValue('Carte')).toBe('12');
    expect(summaryValue('Pagine')).toBe('1');
    expect(summary().getByRole('button', { name: '3 righe da sistemare' })).toBeTruthy();
  });

  it('prints every section: the sideboard counts towards the cards and the pages', async () => {
    // Eight main-deck cards fill most of an A4 page: the sideboard's two need a second one.
    await mountPageAndWrite('8 Sol Ring{Enter}Sideboard{Enter}2 Counterspell{Enter}');
    await screen.findByRole('button', { name: 'Modifica Counterspell' });

    expect(summaryValue('Carte')).toBe('10');
    expect(summaryValue('Pagine')).toBe('2');
  });

  it('brings the first line to fix into view and selects it', async () => {
    const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView');
    const user = await mountPageAndWrite(
      '4 Sol Ring{Enter}2 Nonexistent Card{Enter}1 Lightning{Enter}',
    );
    await screen.findByText('Carta non trovata');

    await user.click(summary().getByRole('button', { name: '2 righe da sistemare' }));

    const [, notFound] = gridTiles();
    expect(notFound?.getAttribute('aria-current')).toBe('true');
    expect(scrollIntoView.mock.contexts).toContain(notFound);
  });

  it('rings the selected line to fix as it rings a selected card', async () => {
    const user = await mountPageAndWrite('2 Nonexistent Card{Enter}');
    await screen.findByText('Carta non trovata');

    await user.click(summary().getByRole('button', { name: '1 riga da sistemare' }));

    const [notFound] = gridTiles();
    const ringed = notFound?.querySelector<HTMLElement>('[style*="box-shadow"]');
    expect(ringColoursOf(ringed)).toEqual(['var(--color-accent)', 'var(--color-selection-edge)']);
  });

  it('takes the lines to fix in the order of the text, whatever section the grid shows them in', async () => {
    const user = await mountPageAndWrite(
      '2 Nonexistent Card{Enter}Commander{Enter}1 Nonexistent Commander{Enter}',
    );
    await screen.findAllByText('Carta non trovata');

    await user.click(summary().getByRole('button', { name: '2 righe da sistemare' }));

    const selected = gridTiles().find((tile) => tile.getAttribute('aria-current') === 'true');
    expect(selected?.textContent).toContain('2 Nonexistent Card');
  });

  it('marks a tile whose print has a warning, outside its image, and the line panel says what', async () => {
    // A first visit asks for Italian cards, and the catalog holds no Italian print.
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    const tileButton = await screen.findByRole('button', { name: 'Modifica Sol Ring' });

    const mark = screen.getByRole('img', { name: 'Stampa in inglese' });
    expect(tileButton.contains(mark)).toBe(false);
    await user.click(tileButton);
    const inspector = within(screen.getByRole('complementary', { name: 'Riga selezionata' }));
    expect(
      inspector.getByText(
        "Nessuna stampa in italiano con un'immagine: viene usata quella inglese.",
      ),
    ).toBeTruthy();
  });

  it('says in the line panel the warning of the tile it was opened from', async () => {
    const lowResolutionNote = "L'immagine di questa stampa è a bassa risoluzione.";
    const user = await mountPageAndWrite('4 Counterspell{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Modifica Counterspell' }));
    await user.click(await screen.findByRole('button', { name: 'Una copia in più con EMA #1' }));
    const inspector = () => within(screen.getByRole('complementary', { name: 'Riga selezionata' }));

    const lowResolutionMark = { name: 'Immagine a bassa risoluzione' };
    expect(tileAt(0).queryByRole('img', lowResolutionMark)).toBeNull();
    expect(inspector().queryByText(lowResolutionNote)).toBeNull();

    await user.click(tileAt(1).getByRole('button', { name: 'Modifica Counterspell' }));

    expect(tileAt(1).getByRole('img', lowResolutionMark)).toBeTruthy();
    expect(inspector().getByText(lowResolutionNote)).toBeTruthy();
  });

  it('switches every line to the language picked in the summary', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    expect(await screen.findByRole('img', { name: 'Stampa in inglese' })).toBeTruthy();

    await user.click(summary().getByRole('radio', { name: 'Inglese' }));

    await waitFor(() =>
      expect(screen.queryByRole('img', { name: 'Stampa in inglese' })).toBeNull(),
    );
    expect(screen.getByRole('button', { name: 'Modifica Sol Ring' })).toBeTruthy();
  });

  it('shows the line to fix in the inspector, where an ambiguous one picks its card', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}1 Lightning{Enter}');
    await user.click(await summary().findByRole('button', { name: '1 riga da sistemare' }));

    const lineToFix = within(screen.getByRole('complementary', { name: 'Riga da sistemare' }));
    expect(lineToFix.getByText('1 Lightning')).toBeTruthy();
    await pickCandidate(user, 'Lightning Bolt', { scope: lineToFix });

    const inspector = within(screen.getByRole('complementary', { name: 'Riga selezionata' }));
    expect(inspector.getByRole('heading', { name: 'Lightning Bolt' })).toBeTruthy();
  });

  it('goes back to the summary from a line to fix', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}2 Nonexistent Card{Enter}');
    await user.click(await summary().findByRole('button', { name: '1 riga da sistemare' }));
    const lineToFix = within(screen.getByRole('complementary', { name: 'Riga da sistemare' }));
    expect(lineToFix.getByText('Correggi la riga nella lista: non verrà stampata.')).toBeTruthy();

    await user.click(lineToFix.getByRole('button', { name: 'Torna al riepilogo' }));

    expect(summary().getByRole('button', { name: '1 riga da sistemare' })).toBeTruthy();
  });

  it('shows no counter once every line is fixed', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}1 Lightning{Enter}');
    await screen.findByText('Quale carta intendevi?');
    expect(summary().getByRole('button', { name: '1 riga da sistemare' })).toBeTruthy();

    await pickCandidate(user, 'Lightning Bolt');

    expect(summary().queryByRole('button', { name: /da sistemare$/ })).toBeNull();
  });
});
