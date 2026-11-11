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
  rgb,
  type PDFImage,
  type PDFOperator,
} from 'pdf-lib';
import { CARD_CORNER_RADIUS_MM, layoutSheet } from './sheet-layout.ts';
import type { BoxMm, Sheet } from './types.ts';

const PT_PER_MM = 72 / 25.4;
/** Thin enough to cut along precisely, thick enough for any printer to render. */
const CROP_MARK_THICKNESS_PT = 0.5;

/**
 * Builds the print-ready PDF from `layoutSheet`. `images` maps each URL from `sheetImageUrls`
 * to its JPG bytes.
 */
export async function generateSheetPdf(
  sheet: Sheet,
  images: ReadonlyMap<string, Uint8Array>,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const layout = layoutSheet(sheet);
  const { pageMm } = layout;
  // Each distinct image is embedded once, however many slots show it.
  const embedded = new Map<string, PDFImage>();

  for (const slots of layout.pages) {
    const pdfPage = doc.addPage([pageMm.width * PT_PER_MM, pageMm.height * PT_PER_MM]);
    for (const slot of slots) {
      const imageUrl = slot.face.imageUris[sheet.options.imageQuality];
      let image = embedded.get(imageUrl);
      if (!image) {
        const bytes = images.get(imageUrl);
        if (!bytes) throw new Error(`Missing image bytes for ${imageUrl}`);
        image = await doc.embedJpg(bytes);
        embedded.set(imageUrl, image);
      }
      // PDF coordinates start at the bottom-left corner of the page.
      const slotBox = { ...slot.box, y: pageMm.height - slot.box.y - slot.box.height };
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
    for (const { from, to } of layout.cropMarks) {
      pdfPage.drawLine({
        start: { x: from.x * PT_PER_MM, y: (pageMm.height - from.y) * PT_PER_MM },
        end: { x: to.x * PT_PER_MM, y: (pageMm.height - to.y) * PT_PER_MM },
        thickness: CROP_MARK_THICKNESS_PT,
        color: rgb(0, 0, 0),
      });
    }
  }
  return doc.save();
}

/** How far a cubic Bézier's control points sit along the tangents to draw a quarter circle. */
const QUARTER_CIRCLE_KAPPA = 0.5522847498;

/**
 * The outline a card is cut and sleeved along: `slot` with rounded corners, in points.
 * Scryfall's JPGs paint the corners outside that curve, white or black depending on the
 * print, so clipping to it lets the paper show there instead (ADR 0007).
 */
function cardOutline(slot: BoxMm): PDFOperator[] {
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

/**
 * The smallest box with the image's aspect ratio that covers `slot`, centred. The image is
 * scaled uniformly, never stretched, and the slot clips what overflows: with Scryfall's
 * images only a sliver of outer border, never the copyright or the artist (ADR 0007).
 */
function coverBox(slot: BoxMm, imageRatio: number): BoxMm {
  const width = Math.max(slot.width, slot.height * imageRatio);
  const height = width / imageRatio;
  return {
    x: slot.x + (slot.width - width) / 2,
    y: slot.y + (slot.height - height) / 2,
    width,
    height,
  };
}
