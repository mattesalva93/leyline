import type { ReleaseChanges } from './release-changes.ts';

/** The file a page left open fetches to learn the release online now (ADR 0025). */
export const VERSION_FILE = 'version.json';

/** What `version.json` says: the release online now and what it changes. */
export interface OnlineRelease extends ReleaseChanges {
  readonly version: string;
}
