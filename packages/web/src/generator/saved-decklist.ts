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
} from '@leyline/core';
import type { LineChoices } from './line-choices.ts';

const STORAGE_KEY = 'leyline.decklist';
/** Raised whenever the saved shape changes: data of any other version is left unread. */
const SAVED_DECKLIST_VERSION = 1;

/** The work on the decklist the generator keeps on the device. Resolutions are not kept. */
interface SavedDecklist {
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

/** A face as saved: decklists saved before artists were kept have none. */
type SavedFace = Omit<PrintFace, 'artist'> & { readonly artist?: string };

/** A print as saved: decklists saved before set names and artists were kept have none. */
type SavedPrint = Omit<Print, 'setName' | 'faces'> & {
  readonly setName?: string;
  readonly faces: readonly SavedFace[];
};

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || isString(value);
}

function isSavedFace(value: unknown): value is SavedFace {
  if (!isRecord(value) || !isString(value.name) || !isRecord(value.imageUris)) return false;
  const { small, normal, large, png } = value.imageUris;
  return [small, normal, large, png].every(isString) && isOptionalString(value.artist);
}

function isSavedPrint(value: unknown): value is SavedPrint {
  return (
    isRecord(value) &&
    isOptionalString(value.setName) &&
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
    isArrayOf(value.faces, isSavedFace) &&
    value.faces.length > 0
  );
}

/** `saved` with what it was saved without: an empty set name and artist, as the catalog has. */
function printOf(saved: SavedPrint): Print {
  return {
    ...saved,
    setName: saved.setName ?? '',
    faces: saved.faces.map((face) => ({ ...face, artist: face.artist ?? '' })),
  };
}

type SavedAllocation = Omit<Allocation, 'print'> & { readonly print: SavedPrint };

function isAllocation(value: unknown): value is SavedAllocation {
  return (
    isRecord(value) &&
    isSavedPrint(value.print) &&
    Number.isInteger(value.quantity) &&
    Number(value.quantity) > 0
  );
}

type SavedAllocationChoice = Omit<AllocationChoice, 'allocations'> & {
  readonly allocations: readonly SavedAllocation[];
};

type SavedLineChoices = Omit<LineChoices, 'allocations'> & {
  readonly allocations?: SavedAllocationChoice;
};

function isAllocationChoice(value: unknown): value is SavedAllocationChoice {
  return isRecord(value) && isString(value.oracleId) && isArrayOf(value.allocations, isAllocation);
}

function isLineChoices(value: unknown): value is SavedLineChoices {
  return (
    isRecord(value) &&
    (value.oracleId === undefined || isString(value.oracleId)) &&
    (value.allocations === undefined || isAllocationChoice(value.allocations))
  );
}

function isChoicesEntry(value: unknown): value is readonly [string, SavedLineChoices] {
  return (
    Array.isArray(value) && value.length === 2 && isString(value[0]) && isLineChoices(value[1])
  );
}

function lineChoicesOf({ allocations, ...choices }: SavedLineChoices): LineChoices {
  if (!allocations) return choices;
  return {
    ...choices,
    allocations: {
      ...allocations,
      allocations: allocations.allocations.map(({ print, quantity }) => ({
        print: printOf(print),
        quantity,
      })),
    },
  };
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
  return {
    decklistText,
    choicesByLine: choicesByLine.map(([key, choices]) => [key, lineChoicesOf(choices)] as const),
    sheetOptions,
  };
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
