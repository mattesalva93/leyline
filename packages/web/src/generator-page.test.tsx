import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from './api.ts';
import {
  mountPageAndWrite,
  pickCandidate,
  decklistValue,
  answerApiCallsFromCatalog,
} from './test-support/workspace-page.ts';
import { centreTab } from './test-support/grid-queries.ts';

vi.mock('./api.ts');

beforeEach(answerApiCallsFromCatalog);

describe('the generator page', () => {
  it('recognises a line once the user breaks the line', async () => {
    const user = await mountPageAndWrite('1 Lightning Bolt{Enter}4 Sol Ring');
    await screen.findByRole('button', { name: 'Modifica Lightning Bolt' });
    expect(screen.getByText('Da riconoscere: vai a capo o esci dal campo')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Modifica Sol Ring' })).toBeNull();

    await user.keyboard('{Enter}');

    expect(await screen.findByRole('button', { name: 'Modifica Sol Ring' })).toBeTruthy();
  });

  it('shows a spinner named after the recognition while the lines are recognised', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });
    expect(screen.queryByRole('progressbar', { name: 'Riconoscimento in corso…' })).toBeNull();
    vi.mocked(api.resolveDecklistText).mockReturnValue(new Promise(() => {}));

    await user.keyboard('1 Lightning Bolt{Enter}');

    expect(screen.getAllByRole('progressbar', { name: 'Riconoscimento in corso…' })).not.toEqual(
      [],
    );
  });

  it('recognises every pasted line, the last one too, breaking the line after a paste at the end', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });
    const requestsBefore = vi.mocked(api.resolveDecklistText).mock.calls.length;

    await user.paste('1 Lightning Bolt\n2 Brainstorm');

    expect(await screen.findByRole('button', { name: 'Modifica Brainstorm' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Modifica Lightning Bolt' })).toBeTruthy();
    const decklist = screen.getByLabelText<HTMLTextAreaElement>('Decklist');
    expect(decklist.value).toBe('4 Sol Ring\n1 Lightning Bolt\n2 Brainstorm\n');
    expect(decklist.selectionStart).toBe(decklist.value.length);
    expect(decklist.selectionEnd).toBe(decklist.value.length);
    expect(vi.mocked(api.resolveDecklistText).mock.calls.length).toBe(requestsBefore + 1);
  });

  it('adds no second line break after a pasted text that already ends with one', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');

    await user.paste('1 Lightning Bolt\n');

    expect(await screen.findByRole('button', { name: 'Modifica Lightning Bolt' })).toBeTruthy();
    expect(decklistValue()).toBe('4 Sol Ring\n1 Lightning Bolt\n');
  });

  it('adds no line break after a paste in the middle of the text, leaving the text after it as it was', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}2 Brainstorm');
    const decklist = screen.getByLabelText<HTMLTextAreaElement>('Decklist');
    const endOfFirstLine = '4 Sol Ring'.length;
    decklist.setSelectionRange(endOfFirstLine, endOfFirstLine);

    await user.paste('\n1 Lightning Bolt');

    expect(await screen.findByRole('button', { name: 'Modifica Lightning Bolt' })).toBeTruthy();
    expect(decklistValue()).toBe('4 Sol Ring\n1 Lightning Bolt\n2 Brainstorm');
    expect(screen.queryByRole('button', { name: 'Modifica Brainstorm' })).toBeNull();
  });

  it('recognises every line of a decklist pasted over a longer text, in one request', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}1 Lightning Bolt{Enter}2 Ponder{Enter}');
    await screen.findByRole('button', { name: 'Modifica Ponder' });
    const requestsBefore = vi.mocked(api.resolveDecklistText).mock.calls.length;
    const decklist = screen.getByLabelText<HTMLTextAreaElement>('Decklist');
    decklist.setSelectionRange(0, decklist.value.length);

    await user.paste('2 Brainstorm\n1 Island\n');

    expect(decklistValue()).toBe('2 Brainstorm\n1 Island\n');
    expect(await screen.findByRole('button', { name: 'Modifica Brainstorm' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Modifica Island' })).toBeTruthy();
    expect(vi.mocked(api.resolveDecklistText).mock.calls.length).toBe(requestsBefore + 1);
  });

  it('recognises every line of a decklist pasted over a text with as many lines, in one request', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}1 Lightning Bolt{Enter}');
    await screen.findByRole('button', { name: 'Modifica Lightning Bolt' });
    const requestsBefore = vi.mocked(api.resolveDecklistText).mock.calls.length;
    const decklist = screen.getByLabelText<HTMLTextAreaElement>('Decklist');
    decklist.setSelectionRange(0, decklist.value.length);

    await user.paste('2 Brainstorm\n1 Island\n');

    expect(decklistValue()).toBe('2 Brainstorm\n1 Island\n');
    expect(await screen.findByRole('button', { name: 'Modifica Brainstorm' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Modifica Island' })).toBeTruthy();
    expect(vi.mocked(api.resolveDecklistText).mock.calls.length).toBe(requestsBefore + 1);
  });

  it('asks the server nothing while a line in the middle is typed, letter by letter', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}2 Ponder');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });
    const requestsBefore = vi.mocked(api.resolveDecklistText).mock.calls.length;
    const decklist = screen.getByLabelText<HTMLTextAreaElement>('Decklist');

    decklist.setSelectionRange('4 Sol'.length, '4 Sol'.length);

    await user.keyboard('a');

    expect(decklistValue()).toBe('4 Sola Ring\n2 Ponder');
    expect(vi.mocked(api.resolveDecklistText).mock.calls.length).toBe(requestsBefore);
  });

  it('resolves an ambiguous line to the candidate the user picks', async () => {
    const user = await mountPageAndWrite('1 Lightning{Enter}');
    expect(await screen.findByText('Quale carta intendevi?')).toBeTruthy();

    await pickCandidate(user, 'Lightning Bolt');

    expect(screen.getByRole('button', { name: 'Modifica Lightning Bolt' })).toBeTruthy();
    expect(screen.queryByText('Quale carta intendevi?')).toBeNull();
  });

  it('rewrites the decklist text when the quantity changes in the line panel', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}1 Lightning Bolt');
    await user.click(await screen.findByRole('button', { name: 'Modifica Sol Ring' }));

    await user.click(screen.getByRole('button', { name: 'Una copia in più' }));

    expect(screen.getByLabelText<HTMLTextAreaElement>('Decklist').value).toBe(
      '5 Sol Ring\n1 Lightning Bolt',
    );
  });

  it('keeps the PDF button disabled until every line is resolved', async () => {
    const user = await mountPageAndWrite('4 Sol Ring{Enter}');
    await screen.findByRole('button', { name: 'Modifica Sol Ring' });
    await user.click(centreTab('Foglio'));
    await user.type(screen.getByLabelText('Decklist'), '1 Lightning Bolt');
    const pdfButton = screen.getByRole<HTMLButtonElement>('button', { name: 'Scarica il PDF' });
    expect(pdfButton.disabled).toBe(true);

    await user.keyboard('{Enter}');

    await waitFor(() => expect(pdfButton.disabled).toBe(false));
  });
});
