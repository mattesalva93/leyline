import type { ReleaseChanges } from './changelog.ts';

/** The file a page left open fetches to learn the release online now (ADR 0025). */
export const VERSION_FILE = 'version.json';

/** What `version.json` says: the release online now and what it changes. */
export interface OnlineRelease extends ReleaseChanges {
  readonly version: string;
}

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

/** Whether `text` is a version written MAJOR.MINOR.PATCH, with no prefix or suffix. */
export const isSemVer = (text: string): boolean => SEMVER.test(text);

const isTextList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

/** The release `body` describes, or null when it is not one this bundle can read. */
export function readOnlineRelease(body: unknown): OnlineRelease | null {
  if (typeof body !== 'object' || body === null) return null;
  const { version, news, fixes } = body as Record<string, unknown>;
  if (typeof version !== 'string' || !isSemVer(version)) return null;
  if (!isTextList(news) || !isTextList(fixes)) return null;
  return { version, news, fixes };
}

/** Whether SemVer `a` is above `b`; both are MAJOR.MINOR.PATCH. */
export function isAbove(a: string, b: string): boolean {
  const [left, right] = [a, b].map((version) => version.split('.').map(Number));
  const differing = left?.findIndex((part, index) => part !== right?.[index]) ?? -1;
  return differing !== -1 && (left?.[differing] ?? 0) > (right?.[differing] ?? 0);
}
