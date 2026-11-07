import {
  PDFDocument,
  appendBezierCurve,
  clip,
  closePath,
  endPath,
  lineTo,
  moveTo,
  popGraphicsState,
  pushGraphicsState,
  type PDFImage,
  type PDFOperator,
} from 'pdf-lib';
import type { Sheet, SheetOptions } from './types.ts';

export const defaultSheetOptions: SheetOptions = { pageFormat: 'A4', imageQuality: 'large' };

const PT_PER_MM = 72 / 25.4;
const PAGE_MM = { A4: { width: 210, height: 297 } } as const;
/** A real Magic card. The one measure the PDF must never get wrong. */
const CARD_MM = { width: 63, height: 88 } as const;
const COLUMNS = 3;
const ROWS = 3;

/** One card-sized cell of the sheet, holding one face image. */
interface Slot {
  readonly imageUrl: string;
}

/** The slots of one printed copy: one per face, so two for a double-faced card. */
type Copy = readonly Slot[];

/** Whether the sheet puts at least one card on paper: what makes a PDF worth generating. */
export function hasPrintableCopies(sheet: Sheet): boolean {
  return copiesOf(sheet).length > 0;
}

function copiesOf(sheet: Sheet): Copy[] {
  return sheet.lines.flatMap((line) => {
    if (line.status !== 'resolved' || !line.defaultPrint) return [];
    const copy = line.defaultPrint.faces.map((face) => ({
      imageUrl: face.imageUris[sheet.options.imageQuality],
    }));
    return Array.from({ length: line.quantity }, () => copy);
  });
}

/**
 * The sheet's cells in reading order, `null` for an empty one. The faces of a copy always sit
 * next to each other in one row, so they can be cut out together: when a copy does not fit in
 * what is left of a row, the next single-faced copy fills the gap, or the gap stays empty.
 */
function cellsOf(sheet: Sheet): (Slot | null)[] {
  const pending = copiesOf(sheet);
  const cells: (Slot | null)[] = [];
  while (pending.length > 0) {
    const free = COLUMNS - (cells.length % COLUMNS);
    const next = pending.findIndex((copy) => copy.length <= free);
    if (next === -1) {
      cells.push(...Array<null>(free).fill(null));
      continue;
    }
    cells.push(...(pending.splice(next, 1)[0] ?? []));
  }
  return cells;
}

/** The distinct image URLs the sheet needs, in print order: fetch these for `generateSheetPdf`. */
export function sheetImageUrls(sheet: Sheet): string[] {
  return [
    ...new Set(
      copiesOf(sheet)
        .flat()
        .map((slot) => slot.imageUrl),
    ),
  ];
}

/**
 * Builds the print-ready PDF: a centred 3×3 grid of 63×88 mm slots per page. `images` maps
 * each URL from `sheetImageUrls` to its JPG bytes.
 */
export async function generateSheetPdf(
  sheet: Sheet,
  images: ReadonlyMap<string, Uint8Array>,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = PAGE_MM[sheet.options.pageFormat];
  const left = (page.width - COLUMNS * CARD_MM.width) / 2;
  const top = (page.height - ROWS * CARD_MM.height) / 2;
  const perPage = COLUMNS * ROWS;
  const cells = cellsOf(sheet);
  // Each distinct image is embedded once, however many slots show it.
  const embedded = new Map<string, PDFImage>();

  for (let first = 0; first < cells.length; first += perPage) {
    const pdfPage = doc.addPage([page.width * PT_PER_MM, page.height * PT_PER_MM]);
    for (const [index, slot] of cells.slice(first, first + perPage).entries()) {
      if (!slot) continue;
      let image = embedded.get(slot.imageUrl);
      if (!image) {
        const bytes = images.get(slot.imageUrl);
        if (!bytes) throw new Error(`Missing image bytes for ${slot.imageUrl}`);
        image = await doc.embedJpg(bytes);
        embedded.set(slot.imageUrl, image);
      }
      const column = index % COLUMNS;
      const row = Math.floor(index / COLUMNS);
      const slotBox = {
        x: left + column * CARD_MM.width,
        y: page.height - top - (row + 1) * CARD_MM.height,
        ...CARD_MM,
      };
      const box = coverBox(slotBox, image.width / image.height);
      pdfPage.pushOperators(pushGraphicsState(), ...cardOutline(slotBox), clip(), endPath());
      pdfPage.drawImage(image, {
        x: box.x * PT_PER_MM,
        y: box.y * PT_PER_MM,
        width: box.width * PT_PER_MM,
        height: box.height * PT_PER_MM,
      });
      pdfPage.pushOperators(popGraphicsState());
    }
  }
  return doc.save();
}

/** Corner radius of a real card, measured on Scryfall's images (about 2.9 mm). */
const CARD_CORNER_RADIUS_MM = 3;
/** How far a cubic Bézier's control points sit along the tangents to draw a quarter circle. */
const QUARTER_CIRCLE_KAPPA = 0.5522847498;

/**
 * The outline a card is cut and sleeved along: `slot` with rounded corners, in points.
 * Scryfall's JPGs paint the corners outside that curve, white or black depending on the
 * print, so clipping to it lets the paper show there instead (ADR 0004).
 */
function cardOutline(slot: Box): PDFOperator[] {
  const [x, y, width, height, r] = [
    slot.x,
    slot.y,
    slot.width,
    slot.height,
    CARD_CORNER_RADIUS_MM,
  ].map((mm) => mm * PT_PER_MM) as [number, number, number, number, number];
  const k = r * QUARTER_CIRCLE_KAPPA;
  const [right, top] = [x + width, y + height];
  return [
    moveTo(x + r, y),
    lineTo(right - r, y),
    appendBezierCurve(right - r + k, y, right, y + r - k, right, y + r),
    lineTo(right, top - r),
    appendBezierCurve(right, top - r + k, right - r + k, top, right - r, top),
    lineTo(x + r, top),
    appendBezierCurve(x + r - k, top, x, top - r + k, x, top - r),
    lineTo(x, y + r),
    appendBezierCurve(x, y + r - k, x + r - k, y, x + r, y),
    closePath(),
  ];
}

interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * The smallest box with the image's aspect ratio that covers `slot`, centred. The image is
 * scaled uniformly, never stretched, and the slot clips what overflows: with Scryfall's
 * images only a sliver of outer border, never the copyright or the artist (ADR 0004).
 */
function coverBox(slot: Box, imageRatio: number): Box {
  const width = Math.max(slot.width, slot.height * imageRatio);
  const height = width / imageRatio;
  return {
    x: slot.x + (slot.width - width) / 2,
    y: slot.y + (slot.height - height) / 2,
    width,
    height,
  };
}
