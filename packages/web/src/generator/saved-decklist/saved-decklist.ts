import {
  currentShapeOf,
  isRecord,
  SAVED_DECKLIST_VERSION,
  type SavedDecklist,
} from './current-shape.ts';
import { migratedToCurrentVersion } from './migrations.ts';

const STORAGE_KEY = 'leyline.decklist';
/** Holds the last saved decklist nothing could read, as it was stored, so it is never lost. */
const SET_ASIDE_KEY = 'leyline.decklist.setAside';

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

function setAside(stored: string) {
  try {
    localStorage.setItem(SET_ASIDE_KEY, stored);
  } catch {
    // Full storage keeps no copy; the generator still starts empty.
  }
}

/**
 * The copy set aside, when this release reads it, put back as the saved decklist. An older
 * release sets aside what a newer one saved, and drops its own key, when the user goes back.
 */
function broughtBackFromSetAside(): SavedDecklist | null {
  const setAsideCopy = localStorage.getItem(SET_ASIDE_KEY);
  const saved = setAsideCopy === null ? null : savedDecklistOf(setAsideCopy);
  if (setAsideCopy === null || !saved) return null;
  try {
    // Moved, not copied: starting over later must not bring it back a second time.
    localStorage.setItem(STORAGE_KEY, setAsideCopy);
    localStorage.removeItem(SET_ASIDE_KEY);
  } catch {
    // Full storage keeps the copy where it is; the generator still opens on it.
  }
  return saved;
}

/**
 * The decklist the user left on this device, or `null` when there is none to read. One that is
 * there but unreadable is set aside first; with none there, the copy set aside comes back if
 * this release reads it.
 */
export function loadSavedDecklist(): SavedDecklist | null {
  let stored: string | null;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) return broughtBackFromSetAside();
  } catch {
    // Storage can be blocked (private windows, site data off): the generator starts empty.
    return null;
  }
  const saved = savedDecklistOf(stored);
  if (!saved) setAside(stored);
  return saved;
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
