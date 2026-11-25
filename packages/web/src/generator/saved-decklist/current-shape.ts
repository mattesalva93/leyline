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
import type { LineChoices } from '../line-choices.ts';

/**
 * The version of the shape below. Raised whenever that shape changes, with a migration step from
 * the version before (ADR 0026).
 */
export const SAVED_DECKLIST_VERSION = 2;

/** The work on the decklist the generator keeps on the device. Resolutions are not kept. */
export interface SavedDecklist {
  readonly decklistText: string;
  /** The choices of each written line, keyed as `choicesKeysOf` names them. */
  readonly choicesByLine: readonly (readonly [string, LineChoices])[];
  readonly sheetOptions: SheetOptions;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isArrayOf<T>(value: unknown, isItem: (item: unknown) => item is T): value is T[] {
  return Array.isArray(value) && value.every(isItem);
}

function isFace(value: unknown): value is PrintFace {
  if (!isRecord(value) || !isString(value.name) || !isRecord(value.imageUris)) return false;
  const { small, normal, large, png } = value.imageUris;
  return [small, normal, large, png].every(isString) && isString(value.artist);
}

function isPrint(value: unknown): value is Print {
  return (
    isRecord(value) &&
    (value.flavorName === null || isString(value.flavorName)) &&
    [
      value.id,
      value.set,
      value.setName,
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
    isArrayOf(value.faces, isFace) &&
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

/** `record` as a saved decklist, or `null` when it is not of the current shape. */
export function currentShapeOf(record: Record<string, unknown>): SavedDecklist | null {
  const { version, decklistText, choicesByLine, sheetOptions } = record;
  if (
    version !== SAVED_DECKLIST_VERSION ||
    !isString(decklistText) ||
    !isArrayOf(choicesByLine, isChoicesEntry) ||
    !isSheetOptions(sheetOptions)
  ) {
    return null;
  }
  return { decklistText, choicesByLine, sheetOptions };
}
