import { type CatalogEntry } from '@mtg-suite/core';
import { aCard, aPrint } from '@mtg-suite/core/test-fixtures';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import * as api from '../api.ts';
import { inMemoryServer } from './in-memory-server.ts';
import { mountApp } from './mount-app.tsx';
import { cardGrid } from './grid-queries.ts';

/** A print of the card `name` from `set`, with its own Scryfall images. */
export function printOf(name: string, id: string, set: string, releasedAt = '2020-01-01') {
  const image = (size: string) => `https://cards.scryfall.io/${size}/front/${id}.jpg`;
  return aPrint({
    id,
    set,
    releasedAt,
    printedName: name,
    faces: [
      {
        name,
        artist: 'Test Artist',
        imageUris: {
          small: image('small'),
          normal: image('normal'),
          large: image('large'),
          png: `https://cards.scryfall.io/png/front/${id}.png`,
        },
      },
    ],
  });
}

export function catalogEntry(oracleId: string, name: string, ...sets: string[]): CatalogEntry {
  return {
    card: aCard({ oracleId, name }),
    // The first set is the newest: the default print.
    prints: (sets.length > 0 ? sets : ['tst']).map((set, index) =>
      printOf(name, `${oracleId}-${set}`, set, `${2020 - index}-01-01`),
    ),
  };
}

/**
 * A card with Italian prints, the newest with a sharp image and the older one with a
 * low-resolution one, and an English print.
 */
const COUNTERSPELL: CatalogEntry = {
  card: aCard({ oracleId: 'counterspell', name: 'Counterspell' }),
  prints: [
    printOf('Counterspell', 'counterspell-a25', 'a25', '2018-03-16'),
    { ...printOf('Counterspell', 'counterspell-it-mh2', 'mh2', '2021-06-18'), lang: 'it' },
    {
      ...printOf('Counterspell', 'counterspell-it-ema', 'ema', '2016-06-10'),
      lang: 'it',
      imageStatus: 'lowres',
    },
  ],
};

/** A card with sharp prints in both languages: two Italian ones and an English one. */
const BRAINSTORM: CatalogEntry = {
  card: aCard({ oracleId: 'brainstorm', name: 'Brainstorm' }),
  prints: [
    { ...printOf('Brainstorm', 'brainstorm-it-ice', 'ice', '2020-01-01'), lang: 'it' },
    { ...printOf('Brainstorm', 'brainstorm-it-mmq', 'mmq', '2019-01-01'), lang: 'it' },
    printOf('Brainstorm', 'brainstorm-c21', 'c21', '2021-01-01'),
  ],
};

/** A double-faced card: its print has a front and a back face, each with its own image. */
const DELVER: CatalogEntry = (() => {
  const front = printOf('Delver of Secrets', 'delver-isd', 'isd');
  const back = printOf('Insectile Aberration', 'delver-isd-back', 'isd').faces;
  return {
    card: aCard({ oracleId: 'delver', name: 'Delver of Secrets // Insectile Aberration' }),
    prints: [{ ...front, faces: [...front.faces, ...back] }],
  };
})();

/** A card whose only Italian print has a placeholder image, so it prints in English. */
const TRINISPHERE: CatalogEntry = {
  card: aCard({ oracleId: 'trinisphere', name: 'Trinisphere' }),
  prints: [
    {
      ...printOf('Trinisfera', 'trinisphere-it-dst', 'dst', '2004-02-06'),
      lang: 'it',
      imageStatus: 'placeholder',
    },
    printOf('Trinisphere', 'trinisphere-dst', 'dst', '2004-02-06'),
    printOf('Trinisphere', 'trinisphere-sld', 'sld', '2023-01-01'),
  ],
};

/** A card Scryfall has no scan of: it has no printable print. */
const UNSCANNED: CatalogEntry = {
  card: aCard({ oracleId: 'unscanned', name: 'Unscanned Card' }),
  prints: [{ ...printOf('Unscanned Card', 'unscanned-tst', 'tst'), imageStatus: 'missing' }],
};

export const CATALOG = [
  TRINISPHERE,
  UNSCANNED,
  catalogEntry('sol-ring', 'Sol Ring', 'c21', 'lea'),
  DELVER,
  BRAINSTORM,
  catalogEntry('lightning-bolt', 'Lightning Bolt', 'tst', 'm10', '2x2'),
  catalogEntry('lightning-helix', 'Lightning Helix'),
  COUNTERSPELL,
  catalogEntry('swords', 'Swords to Plowshares', 'ice', 'mmq', 'c21', 'sta'),
  // The rest of the example decklist.
  catalogEntry('ponder', 'Ponder'),
  catalogEntry('island', 'Island'),
  catalogEntry('mountain', 'Mountain'),
  catalogEntry('pyroblast', 'Pyroblast'),
];

/** Leaves the page and opens it again, as a reload does. */
export function reload() {
  cleanup();
  mountApp('/proxy');
}

/** Mounts the generator page and types `decklistText` into the decklist, as a user would. */
export async function mountPageAndWrite(decklistText: string) {
  const user = userEvent.setup();
  mountApp('/proxy');
  await user.type(screen.getByLabelText('Decklist'), decklistText);
  return user;
}

/** Starts a new decklist from the decklist editor, confirming it. */
export async function startNewDecklist(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Nuova decklist' }));
  await user.click(screen.getByRole('button', { name: 'Svuota' }));
}

/**
 * Steps the carousel of an ambiguous line, in `scope`, to the candidate `name` whose version
 * starts with `version`, and picks it.
 */
export async function pickCandidate(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
  {
    scope = within(document.body),
    version = '',
  }: { scope?: ReturnType<typeof within>; version?: string } = {},
) {
  const carousel = within(await scope.findByRole('group', { name: /^Quale / }));
  const pickButton = (label: string) => label.startsWith(`Scegli ${name} (${version}`);
  for (let step = 0; !carousel.queryByRole('button', { name: pickButton }); step++) {
    if (step > 20) throw new Error(`no candidate ${name}`);
    await user.click(carousel.getByRole('button', { name: 'Candidato successivo' }));
  }
  await user.click(carousel.getByRole('button', { name: pickButton }));
}

/**
 * Moves one copy of `card` off its tile of the print `from` onto the print `to`, with the plus
 * of the open print picker and the minus of that tile: the line keeps its quantity.
 */
export async function moveOneCopy(
  user: ReturnType<typeof userEvent.setup>,
  card: string,
  from: string,
  to: string,
) {
  await user.click(await screen.findByRole('button', { name: `Una copia in più con ${to}` }));
  await user.click(screen.getByRole('button', { name: `Una copia in meno di ${card} (${from})` }));
}

/** The inspector while no tile is selected. */
export function summary() {
  return within(screen.getByRole('complementary', { name: 'Riepilogo' }));
}

/** The bar at the foot of a phone's screen, which picks the step. */
export function stepBar() {
  return within(screen.getByRole('navigation', { name: 'Passi' }));
}

/** The text of the decklist editor. */
export function decklistValue() {
  return screen.getByLabelText<HTMLTextAreaElement>('Decklist').value;
}

/** What a browser hands every event of a drag; jsdom makes none. */
export function aDataTransfer() {
  return { setData: () => {}, dropEffect: 'none', effectAllowed: 'all' };
}

/** Starts dragging `element` with the mouse, as a browser does. */
export function startDrag(element: HTMLElement) {
  fireEvent.dragStart(element, { dataTransfer: aDataTransfer() });
}

/**
 * Opens the search of the add tile ending `section`, or the only add tile when `null`, picks
 * `sectionToPick` if any, and types `name` into the search.
 */
export async function searchToAdd(
  user: ReturnType<typeof userEvent.setup>,
  section: string | null,
  name: string,
  sectionToPick?: string,
) {
  await user.click(
    await screen.findByRole('button', {
      name: section ? `Aggiungi una carta a ${section}` : 'Aggiungi carta',
    }),
  );
  if (sectionToPick) await user.click(screen.getByRole('radio', { name: sectionToPick }));
  await user.type(screen.getByRole('combobox', { name: 'Nome della carta' }), name);
  return screen.findByRole('listbox', { name: 'Carte trovate' });
}

/** The tile a screen reader names `name`. */
export function focusableTile(name: string) {
  return within(cardGrid()).getByRole('listitem', { name });
}

/** Answers every call of `api.ts` from `CATALOG`, on an empty `localStorage`. */
export function answerApiCallsFromCatalog() {
  localStorage.clear();
  // Every call of `api.ts` is answered in memory: one added later is covered without a new line here.
  Object.entries(inMemoryServer(CATALOG)).forEach(([call, answer]) => {
    vi.mocked(api[call as keyof typeof api]).mockImplementation(answer as never);
  });
}
