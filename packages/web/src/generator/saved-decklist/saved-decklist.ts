import {
  currentShapeOf,
  isRecord,
  SAVED_DECKLIST_VERSION,
  type SavedDecklist,
} from './current-shape.ts';
import { migratedToCurrentVersion } from './migrations.ts';

const STORAGE_KEY = 'leyline.decklist';

/**
 * `stored` as a saved decklist, migrated from the version it was saved by, or `null` when not
 * even a migration reads it.
 */
function savedDecklistOf(stored: string): SavedDecklist | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;
  const migrated = migratedToCurrentVersion(parsed);
  return migrated && currentShapeOf(migrated);
}

/** The decklist the user left on this device, or `null` when there is none to read. */
export function loadSavedDecklist(): SavedDecklist | null {
  let stored: string | null;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage can be blocked (private windows, site data off): the generator starts empty.
    return null;
  }
  if (stored === null) return null;
  return savedDecklistOf(stored);
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
