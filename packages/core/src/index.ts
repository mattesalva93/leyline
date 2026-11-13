// Pure domain logic: no I/O (see CODING_STANDARDS.md and eslint.config.js).
export type * from './types.ts';
export { DECKLIST_SECTIONS, IMAGE_STATUSES, LANGS, isLang } from './types.ts';
export { createInMemoryCatalog } from './in-memory-catalog.ts';
export { CARD_SEARCH_LIMIT, searchCards, type CardSearch } from './card-search.ts';
export {
  countPrintsByLang,
  isPrintCursor,
  langWithPrints,
  listPrints,
  type ListPrintsOptions,
  type PrintCountsByLang,
} from './print-list.ts';
export { cardKeys } from './name-match.ts';
export {
  allocateEveryCopy,
  allocatePrintCopies,
  applyAllocationChoice,
  copiesAllocatedTo,
  copiesByPrint,
  fitAllocations,
  unallocatedCopies,
} from './allocation.ts';
export { SECTION_BEFORE_ANY_HEADER, sectionOfEachWrittenLine } from './decklist-section.ts';
export {
  lineRewrittenByMove,
  moveWrittenLine,
  type LineDestination,
  type LineMove,
  type LineSide,
} from './move-written-line.ts';
export {
  addCardToSection,
  type CardAddition,
  type CardToAdd,
  type LineInText,
} from './add-card.ts';
export { printTiles, type PrintTile } from './print-tile.ts';
export { cellAfterArrow, type Arrow, type CellGroup, type CellPlace } from './grid-moves.ts';
export {
  changeTileQuantity,
  writtenLinesOf,
  type TileInText,
  type TileQuantityChange,
} from './decklist-text.ts';
export { changeWritesALineBreak, withLineFeedBreaks } from './line-breaks.ts';
export {
  applyCandidateChoice,
  chooseCandidate,
  copyCount,
  previewPrint,
  resolveDecklist,
  setLineQuantity,
  type ResolveOptions,
} from './decklist.ts';
export {
  CARD_CORNER_RADIUS_MM,
  CARD_MM,
  defaultSheetOptions,
  hasPrintableCopies,
  imageQualities,
  layoutSheet,
  pageFormats,
  sheetImageUrls,
  sheetOptionLimits,
  unprintedLines,
} from './sheet-layout.ts';
export { generateSheetPdf } from './sheet-pdf.ts';
