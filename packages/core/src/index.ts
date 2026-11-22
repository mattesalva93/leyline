// Pure domain logic: no I/O (see CODING_STANDARDS.md and eslint.config.js).
export type * from './types.ts';
export { DECKLIST_SECTIONS, IMAGE_STATUSES, LANGS, isLang } from './types.ts';
export { createInMemoryCatalog } from './test-support/in-memory-catalog.ts';
export { CARD_SEARCH_LIMIT, searchCards, type CardSearch } from './card-search/card-search.ts';
export { listCardsNamed, type CardsNamedQuery } from './card-search/same-named-cards.ts';
export {
  countPrintsByLang,
  isPrintCursor,
  langWithPrints,
  listPrints,
  type ListPrintsOptions,
  type PrintCountsByLang,
} from './print/print-list.ts';
export { cardKeys } from './name-match.ts';
export { nameSharedByEvery, searchRowsOf, type SearchRow } from './card-search/search-rows.ts';
export { isTokenLayout } from './print/print-order.ts';
export { isBlankPrintQuery, MAX_PRINT_QUERY_LENGTH } from './print/print-query.ts';
export { printedBackFace, printedFaces } from './print/printed-faces.ts';
export { releaseYearOf } from './print/release-year.ts';
export {
  allocatePrintCopies,
  applyAllocationChoice,
  copiesAllocatedTo,
  copiesByPrint,
  fitAllocations,
  moveEveryCopy,
  moveTileCopies,
  unallocatedCopies,
} from './print/allocation.ts';
export {
  SECTION_BEFORE_ANY_HEADER,
  sectionOfEachWrittenLine,
} from './decklist/decklist-section.ts';
export {
  lineRewrittenByMove,
  moveWrittenLine,
  type LineDestination,
  type LineMove,
  type LineSide,
} from './decklist/move-written-line.ts';
export {
  addCardToSection,
  type CardAddition,
  type CardToAdd,
  type LineInText,
} from './decklist/add-card.ts';
export { addTokensToSection, type TokensAddition } from './tokens/add-tokens.ts';
export { tokenLineNamingItsPrint, type RewrittenTokenLine } from './tokens/token-line.ts';
export { printTiles, type PrintTile } from './print/print-tile.ts';
export {
  tokenQueryLineOf,
  linesAskedForTokens,
  tokenCreatorNamesOf,
  suggestTokens,
  type TokenSuggestionOptions,
} from './tokens/suggested-tokens.ts';
export {
  cellAfterArrow,
  type Arrow,
  type CellGroup,
  type CellPlace,
} from './decklist/grid-moves.ts';
export {
  changeTileQuantity,
  withoutWrittenLine,
  writtenLinesOf,
  type TileInText,
  type TileQuantityChange,
} from './decklist/decklist-text.ts';
export { changeWritesALineBreak, withLineFeedBreaks } from './decklist/line-breaks.ts';
export {
  applyCandidateChoice,
  chooseCandidate,
  copyCount,
  previewPrint,
  resolveDecklist,
  setLineQuantity,
  type ResolveOptions,
} from './decklist/decklist.ts';
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
} from './sheet/sheet-layout.ts';
export { generateSheetPdf } from './sheet/sheet-pdf.ts';
