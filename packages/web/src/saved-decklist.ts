import {
  IMAGE_STATUSES,
  imageQualities,
  isLang,
  pageFormats,
  sheetOptionLimits,
  type Allocation,
  type AllocationChoice,
  type Print,
  type PrintFace,
  type SheetOptions,
} from '@mtg-suite/core';
import type { LineChoices } from './line-choices.ts';

const STORAGE_KEY = 'mtg-suite.decklist';
/** Raised whenever the saved shape changes: data of any other version is left unread. */
const SAVED_DECKLIST_VERSION = 1;

/** The work on the decklist the generator keeps on the device. Resolutions are not kept. */
export interface SavedDecklist {
  readonly decklistText: string;
  /** The choices of each written line, keyed as `choicesKeysOf` names them. */
  readonly choicesByLine: readonly (readonly [string, LineChoices])[];
  readonly sheetOptions: SheetOptions;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isArrayOf<T>(value: unknown, isItem: (item: unknown) => item is T): value is T[] {
  return Array.isArray(value) && value.every(isItem);
}

function isPrintFace(value: unknown): value is PrintFace {
  if (!isRecord(value) || !isString(value.name) || !isRecord(value.imageUris)) return false;
  const { small, normal, large, png } = value.imageUris;
  return [small, normal, large, png].every(isString);
}

function isPrint(value: unknown): value is Print {
  return (
    isRecord(value) &&
    [
      value.id,
      value.set,
      value.collectorNumber,
      value.printedName,
      value.releasedAt,
      value.layout,
      value.setType,
    ].every(isString) &&
    isLang(value.lang) &&
    IMAGE_STATUSES.some((status) => status === value.imageStatus) &&
    typeof value.digital === 'boolean' &&
    typeof value.oversized === 'boolean' &&
    isArrayOf(value.promoTypes, isString) &&
    isArrayOf(value.faces, isPrintFace) &&
    value.faces.length > 0
  );
}

function isAllocation(value: unknown): value is Allocation {
  return (
    isRecord(value) &&
    isPrint(value.print) &&
    Number.isInteger(value.quantity) &&
    Number(value.quantity) > 0
  );
}

function isAllocationChoice(value: unknown): value is AllocationChoice {
  return isRecord(value) && isString(value.oracleId) && isArrayOf(value.allocations, isAllocation);
}

function isLineChoices(value: unknown): value is LineChoices {
  return (
    isRecord(value) &&
    (value.oracleId === undefined || isString(value.oracleId)) &&
    (value.allocations === undefined || isAllocationChoice(value.allocations))
  );
}

function isChoicesEntry(value: unknown): value is readonly [string, LineChoices] {
  return (
    Array.isArray(value) && value.length === 2 && isString(value[0]) && isLineChoices(value[1])
  );
}

function isWithin(value: unknown, limits: { readonly min: number; readonly max: number }) {
  return typeof value === 'number' && value >= limits.min && value <= limits.max;
}

function isSheetOptions(value: unknown): value is SheetOptions {
  return (
    isRecord(value) &&
    pageFormats.some((pageFormat) => pageFormat === value.pageFormat) &&
    imageQualities.some((imageQuality) => imageQuality === value.imageQuality) &&
    isWithin(value.marginMm, sheetOptionLimits.marginMm) &&
    isWithin(value.spacingMm, sheetOptionLimits.spacingMm) &&
    typeof value.cropMarks === 'boolean'
  );
}

/** `stored` as a saved decklist, or `null` when it is of another version or not readable. */
function savedDecklistOf(stored: string): SavedDecklist | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || parsed.version !== SAVED_DECKLIST_VERSION) return null;
  const { decklistText, choicesByLine, sheetOptions } = parsed;
  if (
    !isString(decklistText) ||
    !isArrayOf(choicesByLine, isChoicesEntry) ||
    !isSheetOptions(sheetOptions)
  ) {
    return null;
  }
  return { decklistText, choicesByLine, sheetOptions };
}

/** The decklist the user left on this device, or `null` when there is none to read. */
export function loadSavedDecklist(): SavedDecklist | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? null : savedDecklistOf(stored);
  } catch {
    // Storage can be blocked (private windows, site data off): the generator starts empty.
    return null;
  }
}

export function saveDecklist(saved: SavedDecklist): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: SAVED_DECKLIST_VERSION, ...saved }),
    );
  } catch {
    // Not kept across visits (blocked or full storage); the generator still works for this one.
  }
}

/** Leaves the device with no decklist to bring back on the next visit. */
export function forgetSavedDecklist(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Blocked storage keeps nothing to forget.
  }
}
