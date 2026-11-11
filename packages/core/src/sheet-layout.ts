import { copiesByPrint } from './allocation.ts';
import type {
  BoxMm,
  CropMark,
  DecklistLine,
  PlacedSlot,
  PrintFace,
  Sheet,
  SheetLayout,
  SheetOptions,
} from './types.ts';

export const defaultSheetOptions: SheetOptions = {
  pageFormat: 'A4',
  imageQuality: 'large',
  marginMm: 5,
  spacingMm: 0,
  cropMarks: true,
};

/**
 * The margins and spacing a sheet accepts, in mm: wide enough for any home printer, narrow
 * enough that an A4 page always holds at least two cards by two.
 */
export const sheetOptionLimits = {
  marginMm: { min: 0, max: 20 },
  spacingMm: { min: 0, max: 10 },
} as const;

const PAGE_MM = { A4: { width: 210, height: 297 } } as const;
/** A real Magic card. The one measure the PDF must never get wrong. */
export const CARD_MM = { width: 63, height: 88 } as const;
/** Corner radius of a real card, measured on Scryfall's images (about 2.9 mm). */
export const CARD_CORNER_RADIUS_MM = 3;
/** How far a crop mark stays from the grid, so it never shows on a card cut a little off. */
const CROP_MARK_GAP_MM = 1;
/** How long a crop mark is when the margin has room for it. */
const CROP_MARK_LENGTH_MM = 4;
/** Absorbs floating-point error, so a grid that fits exactly is not dropped. */
const FIT_TOLERANCE_MM = 1e-9;

/** One card-sized cell of the sheet, holding one face image. */
interface Slot {
  readonly face: PrintFace;
}

/** The slots of one printed copy: one per face, so two for a double-faced card. */
type Copy = readonly Slot[];

/** Whether the sheet puts at least one card on paper: what makes a PDF worth generating. */
export function hasPrintableCopies(sheet: Sheet): boolean {
  return copiesOf(sheet).length > 0;
}

/** The lines that put no copy on the sheet (not found, ambiguous, no print): warn about these. */
export function unprintedLines(sheet: Sheet): DecklistLine[] {
  return sheet.lines.filter((line) => lineCopies(line).length === 0);
}

function copiesOf(sheet: Sheet): Copy[] {
  return sheet.lines.flatMap(lineCopies);
}

/** A line's copies, one per copy of each print it uses. */
function lineCopies(line: DecklistLine): Copy[] {
  if (line.status !== 'resolved') return [];
  return copiesByPrint(line).flatMap(({ print, quantity }) => {
    const copy = print.faces.map((face) => ({ face }));
    return Array.from({ length: quantity }, () => copy);
  });
}

/** The distinct image URLs the sheet needs, in print order: fetch these for `generateSheetPdf`. */
export function sheetImageUrls(sheet: Sheet): string[] {
  return [
    ...new Set(
      copiesOf(sheet)
        .flat()
        .map((slot) => slot.face.imageUris[sheet.options.imageQuality]),
    ),
  ];
}

/** How many cards of `cardMm` fit side by side in `availableMm`, `spacingMm` apart. */
function cardsThatFit(availableMm: number, cardMm: number, spacingMm: number): number {
  return Math.floor((availableMm + spacingMm + FIT_TOLERANCE_MM) / (cardMm + spacingMm));
}

/**
 * Lays the sheet out: as many columns and rows of cards as fit inside the margins, `spacingMm`
 * apart, the grid centred on the page.
 */
export function layoutSheet(sheet: Sheet): SheetLayout {
  const { marginMm, spacingMm } = sheet.options;
  for (const [name, value] of Object.entries({ marginMm, spacingMm })) {
    const { min, max } = sheetOptionLimits[name as keyof typeof sheetOptionLimits];
    if (!(value >= min && value <= max)) {
      throw new RangeError(`${name} must be between ${min} and ${max} mm, got ${value}`);
    }
  }
  const pageMm = PAGE_MM[sheet.options.pageFormat];
  const columns = cardsThatFit(pageMm.width - 2 * marginMm, CARD_MM.width, spacingMm);
  const rows = cardsThatFit(pageMm.height - 2 * marginMm, CARD_MM.height, spacingMm);
  const left = (pageMm.width - (columns * (CARD_MM.width + spacingMm) - spacingMm)) / 2;
  const top = (pageMm.height - (rows * (CARD_MM.height + spacingMm) - spacingMm)) / 2;
  const grid = {
    x: left,
    y: top,
    width: pageMm.width - 2 * left,
    height: pageMm.height - 2 * top,
  };
  const perPage = columns * rows;
  const cells = cellsOf(copiesOf(sheet), columns);
  const pages: PlacedSlot[][] = [];
  for (let first = 0; first < cells.length; first += perPage) {
    pages.push(
      cells.slice(first, first + perPage).flatMap((slot, index) => {
        if (!slot) return [];
        const column = index % columns;
        const row = Math.floor(index / columns);
        const box = {
          x: left + column * (CARD_MM.width + spacingMm),
          y: top + row * (CARD_MM.height + spacingMm),
          ...CARD_MM,
        };
        return [{ box, face: slot.face }];
      }),
    );
  }
  const edges = (start: number, cardMm: number, count: number) =>
    [
      ...new Set(
        Array.from({ length: count }, (_, index) => start + index * (cardMm + spacingMm)).flatMap(
          (edge) => [edge, edge + cardMm],
        ),
      ),
    ].sort((a, b) => a - b);
  const cropMarks = sheet.options.cropMarks
    ? cropMarksAround(
        grid,
        edges(left, CARD_MM.width, columns),
        edges(top, CARD_MM.height, rows),
        pageMm,
        marginMm,
      )
    : [];
  return { pageMm, columns, rows, pages, cropMarks };
}

/**
 * Crop marks on each of `columnEdges` above and below `grid`, and on each of `rowEdges` left
 * and right of it. A mark never enters the margin: it is shortened to the room left, or left
 * out when there is none.
 */
function cropMarksAround(
  grid: BoxMm,
  columnEdges: readonly number[],
  rowEdges: readonly number[],
  pageMm: { readonly width: number; readonly height: number },
  marginMm: number,
): CropMark[] {
  /** The stretch of a mark going away from `gridEdge` towards `pageEdge`, or `null`. */
  const stretch = (gridEdge: number, pageEdge: number): [number, number] | null => {
    const direction = Math.sign(pageEdge - gridEdge);
    const start = gridEdge + direction * CROP_MARK_GAP_MM;
    const room = Math.min(CROP_MARK_LENGTH_MM, Math.abs(pageEdge - start) - marginMm);
    return room > FIT_TOLERANCE_MM ? [start, start + direction * room] : null;
  };
  const marks: CropMark[] = [];
  for (const [gridEdge, pageEdge] of [
    [grid.y, 0],
    [grid.y + grid.height, pageMm.height],
  ] as const) {
    const ys = stretch(gridEdge, pageEdge);
    if (ys) marks.push(...columnEdges.map((x) => ({ from: { x, y: ys[0] }, to: { x, y: ys[1] } })));
  }
  for (const [gridEdge, pageEdge] of [
    [grid.x, 0],
    [grid.x + grid.width, pageMm.width],
  ] as const) {
    const xs = stretch(gridEdge, pageEdge);
    if (xs) marks.push(...rowEdges.map((y) => ({ from: { x: xs[0], y }, to: { x: xs[1], y } })));
  }
  return marks;
}

/**
 * The sheet's cells in reading order, `null` for an empty one. The faces of a copy always sit
 * next to each other in one row, so they can be cut out together: when a copy does not fit in
 * what is left of a row, the next single-faced copy fills the gap, or the gap stays empty.
 */
function cellsOf(copies: readonly Copy[], columns: number): (Slot | null)[] {
  const pending = [...copies];
  const cells: (Slot | null)[] = [];
  while (pending.length > 0) {
    const free = columns - (cells.length % columns);
    // A copy with more faces than a whole row would never fit: it starts a row and wraps.
    const next = pending.findIndex((copy) => copy.length <= free || free === columns);
    if (next === -1) {
      cells.push(...Array<null>(free).fill(null));
      continue;
    }
    cells.push(...(pending.splice(next, 1)[0] ?? []));
  }
  return cells;
}
