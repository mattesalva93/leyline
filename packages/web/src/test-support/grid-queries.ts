import { screen, within } from '@testing-library/react';

/** The tab named `name` at the head of the centre, on a wide screen. */
export function centreTab(name: 'Carte' | 'Foglio') {
  return within(screen.getByRole('tablist')).getByRole('tab', { name });
}

/** The card grid, every section of it. */
export function cardGrid() {
  return screen.getByRole('region', { name: 'Griglia delle carte' });
}

/** The tiles of `container`, in the order it shows them, leaving out the add tiles. */
function tilesIn(container: HTMLElement) {
  return within(container)
    .getAllByRole('listitem')
    .filter((item) => !within(item).queryByRole('button', { name: /^Aggiungi (una )?carta/ }));
}

/** The tiles of the card grid, in the order the grid shows them. */
export function gridTiles() {
  return tilesIn(cardGrid());
}

/** Each section of the card grid: its title with its card count, and the images of its tiles. */
export function gridSections() {
  return within(cardGrid())
    .getAllByRole('region')
    .map((section) => [
      within(section).getByRole('heading').textContent,
      tilesIn(section).map((tile) => tileSummary(tile)[0]),
    ]);
}

/** The tile at `index` in the card grid, to query inside it. */
export function tileAt(index: number) {
  const tile = gridTiles()[index];
  if (!tile) throw new Error(`no tile at ${index}`);
  return within(tile);
}

/** What a tile shows: its image, its quantity and, among siblings, which of them it is. */
export function tileSummary(tile: HTMLElement) {
  return [
    within(tile)
      .queryByRole('img', { name: /^Immagine di / })
      ?.getAttribute('alt'),
    within(tile).queryByText(/×$/)?.textContent,
    within(tile).queryByText(/^\d+\/\d+$/)?.textContent,
  ];
}

/** The button of the print `setAndNumber` in the open print picker: a tap moves copies onto it. */
export function printButtonOf(setAndNumber: string): HTMLElement {
  const counter = screen.getByRole('group', { name: `Copie con ${setAndNumber}` });
  const [printButton] = within(counter.closest('li') ?? counter).getAllByRole('button');
  if (!printButton) throw new Error(`no print button for ${setAndNumber}`);
  return printButton;
}

/** The colour of the sibling group a tile belongs to, if it has siblings. */
export function siblingColourOf(tile: HTMLElement) {
  const coloured = tile.querySelector<HTMLElement>('[style*="--sibling-colour"]');
  return coloured?.style.getPropertyValue('--sibling-colour') || undefined;
}

/** The colours of the rings an element wears, from the element outward. */
export function ringColoursOf(ringed: HTMLElement | null | undefined) {
  return ringed?.style.boxShadow.match(/var\(--[\w-]+\)/g);
}

/** The line a tile draws when it is the focused tile. */
export function focusOutlineOf(tile: HTMLElement | undefined) {
  const outline = tile?.querySelector<HTMLElement>('[data-focus-outline]');
  if (!outline) throw new Error('The tile draws no focus outline');
  return outline;
}
