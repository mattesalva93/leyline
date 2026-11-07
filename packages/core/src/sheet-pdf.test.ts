import { PDFArray, PDFDict, PDFDocument, PDFName, PDFRawStream, decodePDFRawStream } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import {
  defaultSheetOptions,
  generateSheetPdf,
  hasPrintableCopies,
  sheetImageUrls,
  type DecklistLine,
  type Print,
  type Sheet,
} from './index.ts';
import { aCard, aPrint } from './test-fixtures.ts';

const MM_PER_PT = 25.4 / 72;
/** Tolerance for geometry read back from the PDF: 0.01 mm. */
const MM_DIGITS = 2;

interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** An image as the reader sees it: `x`, `y`, `width`, `height` are its visible, clipped box. */
interface PlacedImage extends Box {
  /** The label given to the JPEG by `jpegOfSize`: tells which image is drawn here. */
  readonly label: string;
  /** The whole image as drawn, before clipping: tells whether it was stretched. */
  readonly drawn: Box;
  /** Radius of the corners of the clipping path around it, in mm: 0 for square corners. */
  readonly cornerRadius: number;
}

interface PdfPage {
  readonly widthMm: number;
  readonly heightMm: number;
  /** Where each image is drawn, in mm from the bottom-left corner, in drawing order. */
  readonly imagesMm: readonly PlacedImage[];
}

/** Re-reads a PDF and returns page sizes and image boxes, by interpreting its content streams. */
async function readPdf(bytes: Uint8Array): Promise<PdfPage[]> {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((page) => {
    const { width, height } = page.getSize();
    const contents = page.node.get(PDFName.of('Contents'));
    const refs = contents instanceof PDFArray ? contents.asArray() : [contents];
    const text = refs
      .map((ref) => doc.context.lookup(ref))
      .filter((stream) => stream instanceof PDFRawStream)
      .map((stream) => String.fromCharCode(...decodePDFRawStream(stream).decode()))
      .join('\n');
    const xObjects = page.node.Resources()?.lookupMaybe(PDFName.of('XObject'), PDFDict);
    const labelOf = (name: string) => {
      const image = xObjects?.lookup(PDFName.of(name));
      return image instanceof PDFRawStream ? jpegLabel(image.getContents()) : '';
    };
    return {
      widthMm: width * MM_PER_PT,
      heightMm: height * MM_PER_PT,
      imagesMm: drawnImages(text).map(({ name, drawn, visible, cornerRadius }) => ({
        label: labelOf(name),
        ...toMm(visible),
        drawn: toMm(drawn),
        cornerRadius: cornerRadius * MM_PER_PT,
      })),
    };
  });
}

function toMm(box: Box): Box {
  return {
    x: box.x * MM_PER_PT,
    y: box.y * MM_PER_PT,
    width: box.width * MM_PER_PT,
    height: box.height * MM_PER_PT,
  };
}

function intersect(a: Box, b: Box): Box {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  return {
    x,
    y,
    width: Math.min(a.x + a.width, b.x + b.width) - x,
    height: Math.min(a.y + a.height, b.y + b.height) - y,
  };
}

/** No clipping yet: a box far larger than any page. */
const UNCLIPPED: Box = { x: -1e6, y: -1e6, width: 2e6, height: 2e6 };

type Matrix = readonly [number, number, number, number, number, number];
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

function multiply(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[1] * n[2],
    m[0] * n[1] + m[1] * n[3],
    m[2] * n[0] + m[3] * n[2],
    m[2] * n[1] + m[3] * n[3],
    m[4] * n[0] + m[5] * n[2] + n[4],
    m[4] * n[1] + m[5] * n[3] + n[5],
  ];
}

interface DrawnImage {
  readonly name: string;
  readonly drawn: Box;
  readonly visible: Box;
  readonly cornerRadius: number;
}

interface Point {
  readonly x: number;
  readonly y: number;
}

interface Clip {
  readonly box: Box;
  readonly cornerRadius: number;
}

/**
 * A clipping path read as a box with rounded corners, from its on-curve points: the
 * bounding box, and how far along the bottom edge the first point sits from the corner.
 */
function clipOf(points: readonly Point[]): Clip {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const box = {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
  const onBottomEdge = points.filter((point) => Math.abs(point.y - box.y) < 1e-6);
  const cornerRadius = Math.min(...onBottomEdge.map((point) => point.x)) - box.x;
  return { box, cornerRadius };
}

/**
 * The images (`/Name Do`) in a content stream, in points: the box each is drawn in, the part
 * of it left visible by the clipping path (`W`), and that path's corner radius. Clipping paths
 * are read from their on-curve points (`re`, `m`, `l`, `c`). Assumes no rotation.
 */
function drawnImages(content: string): DrawnImage[] {
  const images: DrawnImage[] = [];
  const stack: { ctm: Matrix; clip: Clip }[] = [];
  const unclipped: Clip = { box: UNCLIPPED, cornerRadius: 0 };
  let ctm = IDENTITY;
  let clip = unclipped;
  let path: Point[] = [];
  const toPage = (x: number, y: number): Point => ({
    x: ctm[0] * x + ctm[4],
    y: ctm[3] * y + ctm[5],
  });
  let operands: number[] = [];
  let name = '';
  for (const token of content.split(/\s+/).filter(Boolean)) {
    const number = Number(token);
    if (!Number.isNaN(number)) {
      operands.push(number);
      continue;
    }
    if (token.startsWith('/')) {
      name = token.slice(1);
      continue;
    }
    if (token === 'q') stack.push({ ctm, clip });
    if (token === 'Q') ({ ctm, clip } = stack.pop() ?? { ctm: IDENTITY, clip: unclipped });
    if (token === 'cm') ctm = multiply(operands as unknown as Matrix, ctm);
    if (token === 're') {
      const [x = 0, y = 0, width = 0, height = 0] = operands;
      path.push(toPage(x, y), toPage(x + width, y), toPage(x, y + height));
      path.push(toPage(x + width, y + height));
    }
    if (token === 'm' || token === 'l' || token === 'c') {
      const [x = 0, y = 0] = operands.slice(-2);
      path.push(toPage(x, y));
    }
    if ((token === 'W' || token === 'W*') && path.length > 0) {
      const next = clipOf(path);
      clip = { box: intersect(clip.box, next.box), cornerRadius: next.cornerRadius };
    }
    if (token === 'n') path = [];
    if (token === 'Do') {
      const drawn = { x: ctm[4], y: ctm[5], width: ctm[0], height: ctm[3] };
      images.push({
        name,
        drawn,
        visible: intersect(drawn, clip.box),
        cornerRadius: clip.cornerRadius,
      });
    }
    operands = [];
  }
  return images;
}

const JPEG_COMMENT = [0xff, 0xfe];

/**
 * A header-only baseline JPEG: enough for a PDF writer to read its size, not a real picture.
 * `label` goes in a comment segment, so the test can tell embedded images apart.
 */
function jpegOfSize(width: number, height: number, label = ''): Uint8Array {
  const text = [...label].map((char) => char.charCodeAt(0));
  const length = text.length + 2;
  return new Uint8Array([
    0xff, 0xd8, // SOI
    ...JPEG_COMMENT, length >> 8, length & 0xff, ...text, // COM
    0xff, 0xc0, 0x00, 0x11, 0x08, // SOF0, length 17, 8 bits per sample
    height >> 8, height & 0xff, width >> 8, width & 0xff,
    0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, // 3 components
    0xff, 0xd9, // EOI
  ]); // prettier-ignore
}

/** Reads back the label `jpegOfSize` wrote. PDF writers embed JPEG bytes as they are. */
function jpegLabel(bytes: Uint8Array): string {
  if (bytes[2] !== JPEG_COMMENT[0] || bytes[3] !== JPEG_COMMENT[1]) return '';
  const length = ((bytes[4] ?? 0) << 8) + (bytes[5] ?? 0);
  return String.fromCharCode(...bytes.subarray(6, 4 + length));
}

function resolvedLine(quantity: number, print: Print): DecklistLine {
  return {
    text: `${quantity} Card Name`,
    status: 'resolved',
    quantity,
    lang: 'en',
    card: aCard(),
    defaultPrint: print,
    allocations: [],
  };
}

function sheetOf(...lines: DecklistLine[]): Sheet {
  return { options: defaultSheetOptions, lines };
}

const print = aPrint();
const largeUrl = print.faces[0]?.imageUris.large ?? '';
/** Same proportions as a real card, so the image fills the 63×88 mm slot exactly. */
const cardRatioImage = new Map([[largeUrl, jpegOfSize(630, 880)]]);

const COLUMNS_MM = [10.5, 73.5, 136.5];
const ROWS_FROM_BOTTOM_MM = [192.5, 104.5, 16.5];

/** Which image sits in which grid cell, page by page: `page:row:column image`. */
function cells(pages: readonly PdfPage[]): string[] {
  return pages.flatMap((page, pageIndex) =>
    page.imagesMm.map((image) => {
      const box = rounded(image);
      const row = ROWS_FROM_BOTTOM_MM.indexOf(box.y);
      const column = COLUMNS_MM.indexOf(box.x);
      return `${pageIndex + 1}:${row + 1}:${column + 1} ${image.label}`;
    }),
  );
}

function rounded(box: Box): Box {
  const round = (value: number) => Number(value.toFixed(MM_DIGITS));
  return {
    x: round(box.x),
    y: round(box.y),
    width: round(box.width),
    height: round(box.height),
  };
}

describe('generateSheetPdf', () => {
  it('lays out nine cards of exactly 63×88 mm on one A4 page, in a centred 3×3 grid', async () => {
    const pdf = await generateSheetPdf(sheetOf(resolvedLine(9, print)), cardRatioImage);

    const pages = await readPdf(pdf);

    expect(pages).toHaveLength(1);
    const [page] = pages;
    expect(page?.widthMm).toBeCloseTo(210, MM_DIGITS);
    expect(page?.heightMm).toBeCloseTo(297, MM_DIGITS);
    // Grid 189×264 mm centred on 210×297 mm: left margin 10.5 mm, top and bottom 16.5 mm.
    const columns = [10.5, 73.5, 136.5];
    const rowsFromBottom = [192.5, 104.5, 16.5];
    const expected = rowsFromBottom.flatMap((y) =>
      columns.map((x) => ({ x, y, width: 63, height: 88 })),
    );
    expect(page?.imagesMm.map(rounded)).toEqual(expected);
  });

  it('fills the slot with a Scryfall "large" image, scaled uniformly, trimming only the side edges', async () => {
    // 672×936 px is slightly wider than a card. 88 mm high gives 63.18 mm wide, centred
    // on the slot: 0.09 mm of outer border is clipped on each side, nothing is stretched (ADR 0004).
    const scryfallImage = new Map([[largeUrl, jpegOfSize(672, 936)]]);

    const [page] = await readPdf(
      await generateSheetPdf(sheetOf(resolvedLine(1, print)), scryfallImage),
    );

    expect(page?.imagesMm.map(rounded)).toEqual([{ x: 10.5, y: 192.5, width: 63, height: 88 }]);
    expect(page?.imagesMm.map((image) => rounded(image.drawn))).toEqual([
      { x: 10.41, y: 192.5, width: 63.18, height: 88 },
    ]);
  });

  it('cuts every card to the shape of a real card: 63×88 mm with 3 mm rounded corners', async () => {
    // Scryfall's JPGs paint the corners outside the card's curve, white or black depending on
    // the print: the curve is what is cut and sleeved, so the paper shows outside it.
    const scryfallImage = new Map([[largeUrl, jpegOfSize(672, 936)]]);

    const [page] = await readPdf(
      await generateSheetPdf(sheetOf(resolvedLine(2, print)), scryfallImage),
    );

    expect(page?.imagesMm.map((image) => Number(image.cornerRadius.toFixed(MM_DIGITS)))).toEqual([
      3, 3,
    ]);
  });

  it('continues on a new page after nine cards', async () => {
    const pages = await readPdf(
      await generateSheetPdf(sheetOf(resolvedLine(10, print)), cardRatioImage),
    );

    expect(pages.map((page) => page.imagesMm.length)).toEqual([9, 1]);
    expect(rounded(pages[1]?.imagesMm[0] as Box)).toEqual({
      x: 10.5,
      y: 192.5,
      width: 63,
      height: 88,
    });
  });

  describe('double-faced cards', () => {
    const face = (side: string) => ({
      name: side,
      imageUris: { small: `s-${side}`, normal: `n-${side}`, large: `l-${side}` },
    });
    const delver = aPrint({ layout: 'transform', faces: [face('front'), face('back')] });
    const solRing = aPrint({ faces: [face('sol')] });
    const bolt = aPrint({ faces: [face('bolt')] });
    const images = new Map(
      ['front', 'back', 'sol', 'bolt'].map((side) => [`l-${side}`, jpegOfSize(630, 880, side)]),
    );
    const pdfCells = async (...lines: DecklistLine[]) =>
      cells(await readPdf(await generateSheetPdf(sheetOf(...lines), images)));

    it('print both faces of each copy next to each other in one row', async () => {
      const notFound: DecklistLine = {
        text: '1 Nope',
        status: 'notFound',
        quantity: 1,
        lang: 'en',
      };
      const sheet = sheetOf(resolvedLine(2, delver), notFound);

      expect(sheetImageUrls(sheet)).toEqual(['l-front', 'l-back']);
      // Column 3 of row 1 stays empty: a back face never wraps to the next row.
      expect(await pdfCells(resolvedLine(2, delver), notFound)).toEqual([
        '1:1:1 front',
        '1:1:2 back',
        '1:2:1 front',
        '1:2:2 back',
      ]);
    });

    it('fill the gap a pair leaves at the end of a row with the next single-faced card', async () => {
      expect(
        await pdfCells(resolvedLine(2, solRing), resolvedLine(1, delver), resolvedLine(1, bolt)),
      ).toEqual(['1:1:1 sol', '1:1:2 sol', '1:1:3 bolt', '1:2:1 front', '1:2:2 back']);
    });

    it('never split a pair across pages', async () => {
      const layout = await pdfCells(resolvedLine(8, solRing), resolvedLine(1, delver));

      expect(layout.slice(-3)).toEqual(['1:3:2 sol', '2:1:1 front', '2:1:2 back']);
    });
  });
});

describe('hasPrintableCopies', () => {
  it('is true when a resolved line has a default print', () => {
    expect(hasPrintableCopies(sheetOf(resolvedLine(1, print)))).toBe(true);
  });

  it('is false when no line has a print to put on the sheet', () => {
    const noPrint: DecklistLine = {
      text: '1 Card Name',
      status: 'resolved',
      quantity: 1,
      lang: 'en',
      card: aCard(),
      defaultPrint: null,
      allocations: [],
    };
    const notFound: DecklistLine = { text: '1 Nope', status: 'notFound', quantity: 1, lang: 'en' };
    const ambiguous: DecklistLine = {
      text: '1 Bolt',
      status: 'ambiguous',
      quantity: 1,
      lang: 'en',
      candidates: [aCard()],
    };

    expect(hasPrintableCopies(sheetOf())).toBe(false);
    expect(hasPrintableCopies(sheetOf(noPrint, notFound, ambiguous))).toBe(false);
  });
});
