// Pure domain logic: no I/O (see CODING_STANDARDS.md and eslint.config.js).
export type * from './types.ts';
export { LANGS, isLang } from './types.ts';
export { createInMemoryCatalog } from './in-memory-catalog.ts';
export { isPrintCursor, listPrints, type ListPrintsOptions } from './print-list.ts';
export { cardKeys } from './name-match.ts';
export {
  applyCandidateChoice,
  chooseCandidate,
  resolveDecklist,
  setLineQuantity,
  type ResolveOptions,
} from './decklist.ts';
export {
  defaultSheetOptions,
  generateSheetPdf,
  hasPrintableCopies,
  sheetImageUrls,
  unprintedLines,
} from './sheet-pdf.ts';
