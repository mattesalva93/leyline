import { isRecord, SAVED_DECKLIST_VERSION } from './current-shape.ts';

/** A saved decklist as JSON gives it back, its shape not checked yet. */
type SavedRecord = Record<string, unknown>;

/** `record` with `fill` applied to each print its line choices allocate copies to. */
function withEachPrint(record: SavedRecord, fill: (print: SavedRecord) => SavedRecord) {
  const { choicesByLine } = record;
  if (!Array.isArray(choicesByLine)) return record;
  return {
    ...record,
    choicesByLine: choicesByLine.map((entry: unknown) => {
      if (!Array.isArray(entry) || !isRecord(entry[1])) return entry;
      const [key, choices] = entry;
      const { allocations } = choices;
      if (!isRecord(allocations) || !Array.isArray(allocations.allocations)) return entry;
      return [
        key,
        {
          ...choices,
          allocations: {
            ...allocations,
            allocations: allocations.allocations.map((allocation: unknown) =>
              isRecord(allocation) && isRecord(allocation.print)
                ? { ...allocation, print: fill(allocation.print) }
                : allocation,
            ),
          },
        },
      ];
    }),
  };
}

/**
 * Version 1 was saved before prints had a set name, artists and alternate names: they become
 * an empty set name and artist, and no alternate name, as the catalog has.
 */
function fromVersion1(record: SavedRecord): SavedRecord {
  return {
    ...withEachPrint(record, (print) => ({
      ...print,
      setName: print.setName ?? '',
      flavorName: print.flavorName ?? null,
      faces: Array.isArray(print.faces)
        ? print.faces.map((face: unknown) =>
            isRecord(face) ? { ...face, artist: face.artist ?? '' } : face,
          )
        : print.faces,
    })),
    version: 2,
  };
}

/** The step bringing a record of each version to the next one, keyed by the version it reads. */
const MIGRATION_STEPS: Readonly<Record<number, (record: SavedRecord) => SavedRecord>> = {
  1: fromVersion1,
};

/**
 * `record` brought step by step from the version it was saved by to the current one, or `null`
 * when no chain of steps leads there: no version, or one unknown or newer than the current.
 */
export function migratedToCurrentVersion(record: SavedRecord): SavedRecord | null {
  let migrated = record;
  while (migrated.version !== SAVED_DECKLIST_VERSION) {
    const step =
      typeof migrated.version === 'number' ? MIGRATION_STEPS[migrated.version] : undefined;
    if (!step) return null;
    migrated = step(migrated);
  }
  return migrated;
}
