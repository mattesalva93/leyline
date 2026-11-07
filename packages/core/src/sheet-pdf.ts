import { PDFDocument, type PDFImage } from 'pdf-lib';
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
      const box = containBox(slotBox, image.width / image.height);
      pdfPage.drawImage(image, {
        x: box.x * PT_PER_MM,
        y: box.y * PT_PER_MM,
        width: box.width * PT_PER_MM,
        height: box.height * PT_PER_MM,
      });
    }
  }
  return doc.save();
}

interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * The largest box with the image's aspect ratio that fits in `slot`, centred: images are
 * scaled uniformly, never cropped or stretched (ADR 0004).
 */
function containBox(slot: Box, imageRatio: number): Box {
  const width = Math.min(slot.width, slot.height * imageRatio);
  const height = width / imageRatio;
  return {
    x: slot.x + (slot.width - width) / 2,
    y: slot.y + (slot.height - height) / 2,
    width,
    height,
  };
}
