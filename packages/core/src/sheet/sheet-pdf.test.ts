import { PDFArray, PDFDict, PDFDocument, PDFName, PDFRawStream, decodePDFRawStream } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import {
  defaultSheetOptions,
  generateSheetPdf,
  hasPrintableCopies,
  layoutSheet,
  sheetOptionLimits,
  sheetImageUrls,
  unprintedLines,
  type DecklistLine,
  type Print,
  type Sheet,
  type SheetOptions,
} from '../index.ts';
import { aCard, aPrint, JPEG_COMMENT, jpegOfSize } from '../test-support/test-fixtures.ts';

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
  /** Every stroked straight line, in mm from the bottom-left corner, in drawing order. */
  readonly linesMm: readonly Segment[];
}

interface Segment {
  readonly from: Point;
  readonly to: Point;
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
    const { images, lines } = drawnContent(text);
    return {
      widthMm: width * MM_PER_PT,
      heightMm: height * MM_PER_PT,
      linesMm: lines.map(({ from, to }) => ({
        from: { x: from.x * MM_PER_PT, y: from.y * MM_PER_PT },
        to: { x: to.x * MM_PER_PT, y: to.y * MM_PER_PT },
      })),
      imagesMm: images.map(({ name, drawn, visible, cornerRadius }) => ({
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
 * are read from their on-curve points (`re`, `m`, `l`, `c`). Also the straight lines stroked
 * (`m` then `l`, then `S`). Assumes no rotation.
 */
function drawnContent(content: string): { images: DrawnImage[]; lines: Segment[] } {
  const images: DrawnImage[] = [];
  const lines: Segment[] = [];
  let segments: Segment[] = [];
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
      const point = toPage(x, y);
      const previous = path.at(-1);
      if (token === 'l' && previous) segments.push({ from: previous, to: point });
      path.push(point);
    }
    if (token === 'S') {
      lines.push(...segments);
      path = [];
    }
    if ((token === 'W' || token === 'W*') && path.length > 0) {
      const next = clipOf(path);
      clip = { box: intersect(clip.box, next.box), cornerRadius: next.cornerRadius };
    }
    if (token === 'n' || token === 'S') segments = [];
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
  return { images, lines };
}

/** Reads back the label `jpegOfSize` wrote. PDF writers embed JPEG bytes as they are. */
function jpegLabel(bytes: Uint8Array): string {
  if (bytes[2] !== JPEG_COMMENT[0] || bytes[3] !== JPEG_COMMENT[1]) return '';
  const length = ((bytes[4] ?? 0) << 8) + (bytes[5] ?? 0);
  return String.fromCharCode(...bytes.subarray(6, 4 + length));
}

/**
 * A blank, fully transparent RGBA PNG: a real image a PDF writer can decode, built without
 * compression (deflate "stored" blocks) since `core` may not import `node:zlib`.
 */
function pngOfSize(width: number, height: number): Uint8Array {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc32 = (bytes: Uint8Array) => {
    let c = 0xffffffff;
    for (const byte of bytes) c = (crcTable[(c ^ byte) & 0xff] ?? 0) ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const uint32 = (value: number) => [
    value >>> 24,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ];
  const chunk = (type: string, data: Uint8Array) => {
    const typed = new Uint8Array([...[...type].map((char) => char.charCodeAt(0)), ...data]);
    return [...uint32(data.length), ...typed, ...uint32(crc32(typed))];
  };
  // Each row: filter byte 0, then 4 zero bytes per pixel.
  const raw = new Uint8Array(height * (1 + width * 4));
  const zlib: number[] = [0x78, 0x01];
  const BLOCK = 0xffff;
  for (let start = 0; start < raw.length; start += BLOCK) {
    const block = raw.subarray(start, start + BLOCK);
    const isLast = start + BLOCK >= raw.length ? 1 : 0;
    const length = block.length;
    zlib.push(isLast, length & 0xff, length >> 8, ~length & 0xff, (~length >> 8) & 0xff, ...block);
  }
  let [a, b] = [1, 0];
  for (const byte of raw) [a, b] = [(a + byte) % 65521, (b + ((a + byte) % 65521)) % 65521];
  zlib.push(...uint32(((b << 16) | a) >>> 0));
  return new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ...chunk('IHDR', new Uint8Array([...uint32(width), ...uint32(height), 8, 6, 0, 0, 0])),
    ...chunk('IDAT', new Uint8Array(zlib)),
    ...chunk('IEND', new Uint8Array()),
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
    printWarning: null,
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

  it('lays out nine cards of exactly 63×88 mm on one Letter page, in a centred 3×3 grid', async () => {
    const sheet = {
      options: { ...defaultSheetOptions, pageFormat: 'Letter' as const },
      lines: [resolvedLine(9, print)],
    };

    const pages = await readPdf(await generateSheetPdf(sheet, cardRatioImage));

    expect(pages).toHaveLength(1);
    const [page] = pages;
    // Letter is 8.5×11 in: 215.9×279.4 mm. Grid 189×264 mm centred on it: left margin
    // 13.45 mm, top and bottom 7.7 mm.
    expect(page?.widthMm).toBeCloseTo(215.9, MM_DIGITS);
    expect(page?.heightMm).toBeCloseTo(279.4, MM_DIGITS);
    const columns = [13.45, 76.45, 139.45];
    const rowsFromBottom = [183.7, 95.7, 7.7];
    expect(page?.imagesMm.map(rounded)).toEqual(
      rowsFromBottom.flatMap((y) => columns.map((x) => ({ x, y, width: 63, height: 88 }))),
    );
  });

  it('fills the slot with a Scryfall "large" image, scaled uniformly, trimming only the side edges', async () => {
    // 672×936 px is slightly wider than a card. 88 mm high gives 63.18 mm wide, centred
    // on the slot: 0.09 mm of outer border is clipped on each side, nothing is stretched (ADR 0007).
    const scryfallImage = new Map([[largeUrl, jpegOfSize(672, 936)]]);

    const [page] = await readPdf(
      await generateSheetPdf(sheetOf(resolvedLine(1, print)), scryfallImage),
    );

    expect(page?.imagesMm.map(rounded)).toEqual([{ x: 10.5, y: 192.5, width: 63, height: 88 }]);
    expect(page?.imagesMm.map((image) => rounded(image.drawn))).toEqual([
      { x: 10.41, y: 192.5, width: 63.18, height: 88 },
    ]);
  });

  it('at maximum quality, fills the slot with the Scryfall PNG, trimming only the top and bottom edges', async () => {
    // Scryfall's PNG is 744×1040 px, slightly narrower than a card. 63 mm wide gives 88.06 mm
    // high, centred on the slot: 0.03 mm of outer border is clipped top and bottom (ADR 0007).
    const pngUrl = print.faces[0]?.imageUris.png ?? '';
    const sheet = {
      options: { ...defaultSheetOptions, imageQuality: 'png' as const },
      lines: [resolvedLine(1, print)],
    };

    const [page] = await readPdf(
      await generateSheetPdf(sheet, new Map([[pngUrl, pngOfSize(744, 1040)]])),
    );

    expect(sheetImageUrls(sheet)).toEqual(['https://cards.scryfall.io/png/front/x.png']);
    expect(page?.imagesMm.map(rounded)).toEqual([{ x: 10.5, y: 192.5, width: 63, height: 88 }]);
    expect(page?.imagesMm.map((image) => rounded(image.drawn))).toEqual([
      { x: 10.5, y: 192.47, width: 63, height: 88.06 },
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

  it('prints a plane as Scryfall serves it, upright like any card', async () => {
    // Planes are played sideways, but Scryfall already serves them upright: turning them again
    // would clip the copyright line away (ADR 0014).
    const plane = aPrint({ layout: 'planar' });
    const scryfallImage = new Map([[largeUrl, jpegOfSize(672, 936)]]);

    const [page] = await readPdf(
      await generateSheetPdf(sheetOf(resolvedLine(1, plane)), scryfallImage),
    );

    expect(page?.imagesMm.map((image) => rounded(image.drawn))).toEqual([
      { x: 10.41, y: 192.5, width: 63.18, height: 88 },
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

  describe('margins and spacing', () => {
    const layoutOf = async (options: Partial<SheetOptions>, quantity: number) =>
      readPdf(
        await generateSheetPdf(
          {
            options: { ...defaultSheetOptions, ...options },
            lines: [resolvedLine(quantity, print)],
          },
          cardRatioImage,
        ),
      );

    it('leaves the spacing between cards and centres the grid on the page', async () => {
      // 3 columns of 63 mm + 2 gaps of 2 mm = 193 mm; 3 rows of 88 mm + 2 gaps = 268 mm.
      const [page] = await layoutOf({ marginMm: 5, spacingMm: 2 }, 9);

      const columns = [8.5, 73.5, 138.5];
      const rowsFromBottom = [194.5, 104.5, 14.5];
      expect(page?.imagesMm.map(rounded)).toEqual(
        rowsFromBottom.flatMap((y) => columns.map((x) => ({ x, y, width: 63, height: 88 }))),
      );
    });

    it('puts fewer cards on a page when the margins leave no room for another column', async () => {
      // 210 mm − 2 × 15 mm leaves 180 mm: two 63 mm columns, centred 42 mm from each side.
      const pages = await layoutOf({ marginMm: 15, spacingMm: 0 }, 7);

      expect(pages.map((page) => page.imagesMm.length)).toEqual([6, 1]);
      expect(pages[0]?.imagesMm.slice(0, 2).map((image) => rounded(image).x)).toEqual([42, 105]);
    });
  });

  describe('crop marks', () => {
    const pageOf = async (options: Partial<SheetOptions>) => {
      const sheet = {
        options: { ...defaultSheetOptions, ...options },
        lines: [resolvedLine(9, print)],
      };
      const [page] = await readPdf(await generateSheetPdf(sheet, cardRatioImage));
      return page;
    };
    // The grid of the 3 mm margin, 1 mm spacing sheet: 191×266 mm, 9.5 mm from the sides,
    // 15.5 mm from top and bottom. Each gap between two cards has two edges.
    const columnEdges = [9.5, 72.5, 73.5, 136.5, 137.5, 200.5];
    const rowEdgesFromBottom = [15.5, 103.5, 104.5, 192.5, 193.5, 281.5];
    /** A line as `x1,y1 → x2,y2`, its ends in increasing order, rounded to 0.01 mm. */
    const described = ({ from, to }: Segment) => {
      const [a, b] = [from, to].sort((p, q) => p.x - q.x || p.y - q.y) as [Point, Point];
      const mm = (value: number) => Number(value.toFixed(MM_DIGITS));
      return `${mm(a.x)},${mm(a.y)} → ${mm(b.x)},${mm(b.y)}`;
    };

    it('marks every card edge outside the grid, 1 mm away from it and 4 mm long', async () => {
      const page = await pageOf({ marginMm: 3, spacingMm: 1, cropMarks: true });
      const outsideGrid = ({ from, to }: Segment) =>
        Math.max(from.x, to.x) < 9.5 ||
        Math.min(from.x, to.x) > 200.5 ||
        Math.max(from.y, to.y) < 15.5 ||
        Math.min(from.y, to.y) > 281.5;

      expect(page?.linesMm.filter(outsideGrid).map(described).sort()).toEqual(
        [
          ...columnEdges.flatMap((x) => [`${x},10.5 → ${x},14.5`, `${x},282.5 → ${x},286.5`]),
          ...rowEdgesFromBottom.flatMap((y) => [`4.5,${y} → 8.5,${y}`, `201.5,${y} → 205.5,${y}`]),
        ].sort(),
      );
    });

    it('marks every card edge across the gaps between cards, from corner to corner', async () => {
      // Same 191×266 mm grid: 1 mm gaps between rows at 103.5–104.5 and 192.5–193.5 mm from the
      // bottom, between columns at 72.5–73.5 and 136.5–137.5 mm. Where two gaps cross, the
      // marks close a small square.
      const page = await pageOf({ marginMm: 3, spacingMm: 1, cropMarks: true });
      const insideGrid = ({ from, to }: Segment) =>
        Math.min(from.x, to.x) >= 9.5 &&
        Math.max(from.x, to.x) <= 200.5 &&
        Math.min(from.y, to.y) >= 15.5 &&
        Math.max(from.y, to.y) <= 281.5;

      const rowGaps = [
        [103.5, 104.5],
        [192.5, 193.5],
      ];
      const columnGaps = [
        [72.5, 73.5],
        [136.5, 137.5],
      ];
      expect(page?.linesMm.filter(insideGrid).map(described).sort()).toEqual(
        [
          ...rowGaps.flatMap(([bottom, top]) =>
            columnEdges.map((x) => `${x},${bottom} → ${x},${top}`),
          ),
          ...columnGaps.flatMap(([left, right]) =>
            rowEdgesFromBottom.map((y) => `${left},${y} → ${right},${y}`),
          ),
        ].sort(),
      );
    });

    it('draws no mark between cards that touch', async () => {
      const page = await pageOf({ marginMm: 5, spacingMm: 0, cropMarks: true });

      expect(page?.linesMm).toHaveLength(16);
    });

    it('shortens a mark rather than print inside the margin, and leaves it out with no room', async () => {
      // Margin 8 mm: the grid sits 10.5 mm from the sides, so side marks run from 9.5 mm to
      // the margin, 1.5 mm long. Margin 10 mm leaves 0.5 mm, less than the 1 mm gap.
      const shortened = await pageOf({ marginMm: 8, cropMarks: true });
      const none = await pageOf({ marginMm: 10, cropMarks: true });

      expect(shortened?.linesMm.map(described)).toContain('8,16.5 → 9.5,16.5');
      expect(shortened?.linesMm.map(described)).toContain('200.5,16.5 → 202,16.5');
      const sideMarks = (page?: PdfPage) =>
        page?.linesMm.filter((line) => line.from.y === line.to.y) ?? [];
      expect(sideMarks(shortened)).toHaveLength(8);
      expect(sideMarks(none)).toEqual([]);
      expect(none?.linesMm).toHaveLength(8);
    });

    it('draws no line at all when crop marks are off', async () => {
      const page = await pageOf({ cropMarks: false });

      expect(page?.linesMm).toEqual([]);
    });
  });

  describe('double-faced cards', () => {
    const face = (side: string) => ({
      name: side,
      artist: '',
      imageUris: { small: `s-${side}`, normal: `n-${side}`, large: `l-${side}`, png: `p-${side}` },
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

    it('print only the front of an art series card: its back is no card to play', async () => {
      const artSeries = aPrint({ layout: 'art_series', faces: [face('front'), face('back')] });
      const sheet = sheetOf(resolvedLine(1, artSeries), resolvedLine(1, solRing));

      expect(sheetImageUrls(sheet)).toEqual(['l-front', 'l-sol']);
      expect(await pdfCells(resolvedLine(1, artSeries), resolvedLine(1, solRing))).toEqual([
        '1:1:1 front',
        '1:1:2 sol',
      ]);
    });

    it('never split a pair across pages', async () => {
      const layout = await pdfCells(resolvedLine(8, solRing), resolvedLine(1, delver));

      expect(layout.slice(-3)).toEqual(['1:3:2 sol', '2:1:1 front', '2:1:2 back']);
    });
  });
});

describe('sheetImageUrls', () => {
  const chosen = aPrint({
    id: 'chosen',
    faces: [
      {
        name: 'Card Name',
        artist: '',
        imageUris: {
          small: 'https://cards.scryfall.io/small/front/chosen.jpg',
          normal: 'https://cards.scryfall.io/normal/front/chosen.jpg',
          large: 'https://cards.scryfall.io/large/front/chosen.jpg',
          png: 'https://cards.scryfall.io/png/front/chosen.png',
        },
      },
    ],
  });

  it('uses the allocated print for the copies it holds, the default print for the rest', () => {
    const allChosen = { ...resolvedLine(3, print), allocations: [{ print: chosen, quantity: 3 }] };
    const oneChosen = { ...resolvedLine(3, print), allocations: [{ print: chosen, quantity: 1 }] };

    expect(sheetImageUrls(sheetOf(allChosen))).toEqual([
      'https://cards.scryfall.io/large/front/chosen.jpg',
    ]);
    expect(sheetImageUrls(sheetOf(oneChosen))).toEqual([
      'https://cards.scryfall.io/large/front/chosen.jpg',
      largeUrl,
    ]);
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
      printWarning: null,
      allocations: [],
    };
    const notFound: DecklistLine = { text: '1 Nope', status: 'notFound', quantity: 1, lang: 'en' };
    const ambiguous: DecklistLine = {
      text: '1 Bolt',
      status: 'ambiguous',
      quantity: 1,
      lang: 'en',
      candidates: [{ card: aCard(), defaultPrint: print, printWarning: null }],
    };

    expect(hasPrintableCopies(sheetOf())).toBe(false);
    expect(hasPrintableCopies(sheetOf(noPrint, notFound, ambiguous))).toBe(false);
  });
});

describe('unprintedLines', () => {
  it('lists the lines that put no copy on the sheet, in decklist order', () => {
    const printed = resolvedLine(2, print);
    const notFound: DecklistLine = { text: '1 Nope', status: 'notFound', quantity: 1, lang: 'en' };
    const ambiguous: DecklistLine = {
      text: '1 Lightning',
      status: 'ambiguous',
      quantity: 1,
      lang: 'en',
      candidates: [{ card: aCard(), defaultPrint: print, printWarning: null }],
    };
    const noPrint: DecklistLine = {
      text: '1 Digital Only',
      status: 'resolved',
      quantity: 1,
      lang: 'en',
      card: aCard(),
      defaultPrint: null,
      printWarning: null,
      allocations: [],
    };

    expect(unprintedLines(sheetOf(notFound, printed, ambiguous, noPrint))).toEqual([
      notFound,
      ambiguous,
      noPrint,
    ]);
  });
});

describe('layoutSheet', () => {
  const withOptions = (options: Partial<SheetOptions>): Sheet => ({
    options: { ...defaultSheetOptions, ...options },
    lines: [resolvedLine(1, print)],
  });

  it('places every slot and crop mark where the PDF draws them, so a preview matches the PDF', async () => {
    const delver = aPrint({
      layout: 'transform',
      faces: ['front', 'back'].map((side) => ({
        name: side,
        artist: '',
        imageUris: {
          small: `s-${side}`,
          normal: `n-${side}`,
          large: `l-${side}`,
          png: `p-${side}`,
        },
      })),
    });
    const sheet: Sheet = {
      options: { ...defaultSheetOptions, marginMm: 3, spacingMm: 1.5 },
      lines: [resolvedLine(8, print), resolvedLine(2, delver)],
    };
    const images = new Map([
      [largeUrl, jpegOfSize(672, 936)],
      ['l-front', jpegOfSize(672, 936)],
      ['l-back', jpegOfSize(672, 936)],
    ]);

    const layout = layoutSheet(sheet);
    const pages = await readPdf(await generateSheetPdf(sheet, images));

    const fromBottom = (box: Box): Box => ({
      ...box,
      y: layout.pageMm.height - box.y - box.height,
    });
    const roundedPoint = ({ x, y }: Point): Point => ({
      x: Number(x.toFixed(MM_DIGITS)),
      y: Number(y.toFixed(MM_DIGITS)),
    });
    const segmentFromBottom = ({ from, to }: Segment): Segment => ({
      from: roundedPoint({ ...from, y: layout.pageMm.height - from.y }),
      to: roundedPoint({ ...to, y: layout.pageMm.height - to.y }),
    });
    expect(pages.map((page) => page.imagesMm.map(rounded))).toEqual(
      layout.pages.map((slots) => slots.map((slot) => rounded(fromBottom(slot.box)))),
    );
    for (const page of pages) {
      expect(
        page.linesMm.map(({ from, to }) => ({ from: roundedPoint(from), to: roundedPoint(to) })),
      ).toEqual(layout.cropMarks.map(segmentFromBottom));
    }
    expect(pages.length).toBeGreaterThan(1);
  });

  it('still fits two cards by two at the widest margin and spacing it accepts', () => {
    const { marginMm, spacingMm } = sheetOptionLimits;

    const layout = layoutSheet(withOptions({ marginMm: marginMm.max, spacingMm: spacingMm.max }));

    expect([layout.columns, layout.rows]).toEqual([2, 2]);
  });

  it('still fits two cards by two on Letter at the widest margin and spacing it accepts', () => {
    const { marginMm, spacingMm } = sheetOptionLimits;

    const layout = layoutSheet(
      withOptions({ pageFormat: 'Letter', marginMm: marginMm.max, spacingMm: spacingMm.max }),
    );

    expect([layout.columns, layout.rows]).toEqual([2, 2]);
  });

  it('rejects a margin or a spacing outside the limits', () => {
    const { marginMm, spacingMm } = sheetOptionLimits;

    expect(() => layoutSheet(withOptions({ marginMm: marginMm.max + 1 }))).toThrow(RangeError);
    expect(() => layoutSheet(withOptions({ marginMm: marginMm.min - 1 }))).toThrow(RangeError);
    expect(() => layoutSheet(withOptions({ spacingMm: spacingMm.max + 1 }))).toThrow(RangeError);
    expect(() => layoutSheet(withOptions({ spacingMm: Number.NaN }))).toThrow(RangeError);
  });
});
