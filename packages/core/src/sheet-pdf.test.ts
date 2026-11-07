import { PDFArray, PDFDocument, PDFName, PDFRawStream, decodePDFRawStream } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import {
  defaultSheetOptions,
  generateSheetPdf,
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

interface PdfPage {
  readonly widthMm: number;
  readonly heightMm: number;
  /** Where each image is drawn, in mm from the bottom-left corner, in drawing order. */
  readonly imagesMm: readonly Box[];
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
    return {
      widthMm: width * MM_PER_PT,
      heightMm: height * MM_PER_PT,
      imagesMm: drawnImages(text).map((box) => ({
        x: box.x * MM_PER_PT,
        y: box.y * MM_PER_PT,
        width: box.width * MM_PER_PT,
        height: box.height * MM_PER_PT,
      })),
    };
  });
}

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

/** Boxes of the images (`Do`) in a content stream, in points. Assumes no rotation. */
function drawnImages(content: string): Box[] {
  const boxes: Box[] = [];
  const stack: Matrix[] = [];
  let ctm = IDENTITY;
  let operands: number[] = [];
  for (const token of content.split(/\s+/).filter(Boolean)) {
    const number = Number(token);
    if (!Number.isNaN(number)) {
      operands.push(number);
      continue;
    }
    if (token === 'q') stack.push(ctm);
    if (token === 'Q') ctm = stack.pop() ?? IDENTITY;
    if (token === 'cm') ctm = multiply(operands as unknown as Matrix, ctm);
    if (token === 'Do') boxes.push({ x: ctm[4], y: ctm[5], width: ctm[0], height: ctm[3] });
    if (!token.startsWith('/')) operands = [];
  }
  return boxes;
}

/** A header-only baseline JPEG: enough for a PDF writer to read its size, not a real picture. */
function jpegOfSize(width: number, height: number): Uint8Array {
  return new Uint8Array([
    0xff, 0xd8, // SOI
    0xff, 0xc0, 0x00, 0x11, 0x08, // SOF0, length 17, 8 bits per sample
    height >> 8, height & 0xff, width >> 8, width & 0xff,
    0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, // 3 components
    0xff, 0xd9, // EOI
  ]); // prettier-ignore
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

  it('scales a Scryfall "large" image uniformly to fit its slot, centred, never stretched', async () => {
    // 672×936 px is slightly wider than a card: 63 mm wide gives 87.75 mm high (ADR 0004).
    const scryfallImage = new Map([[largeUrl, jpegOfSize(672, 936)]]);

    const [page] = await readPdf(
      await generateSheetPdf(sheetOf(resolvedLine(1, print)), scryfallImage),
    );

    expect(page?.imagesMm.map(rounded)).toEqual([{ x: 10.5, y: 192.63, width: 63, height: 87.75 }]);
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

  it('prints both faces of a double-faced card side by side, and skips unresolved lines', async () => {
    const face = (side: string) => ({
      name: side,
      imageUris: { small: `s-${side}`, normal: `n-${side}`, large: `l-${side}` },
    });
    const delver = aPrint({ layout: 'transform', faces: [face('front'), face('back')] });
    const notFound: DecklistLine = { text: '1 Nope', status: 'notFound', quantity: 1, lang: 'en' };
    const sheet = sheetOf(resolvedLine(2, delver), notFound);
    const images = new Map([
      ['l-front', jpegOfSize(630, 880)],
      ['l-back', jpegOfSize(630, 880)],
    ]);

    expect(sheetImageUrls(sheet)).toEqual(['l-front', 'l-back']);
    const [page] = await readPdf(await generateSheetPdf(sheet, images));
    // Front, back, front, back: each copy's faces sit next to each other.
    expect(page?.imagesMm.map(rounded).map((box) => [box.x, box.y])).toEqual([
      [10.5, 192.5],
      [73.5, 192.5],
      [136.5, 192.5],
      [10.5, 104.5],
    ]);
  });
});
