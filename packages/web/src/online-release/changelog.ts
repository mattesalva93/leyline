// The format of CHANGELOG.md (ADR 0025), read in one place: by the web build, for version.json,
// and by scripts/check-release.js, which Node runs on this file as it is.

/** What a release changes for testers, as its changelog entry lists it. */
export interface ReleaseChanges {
  /** The items under «Novità». */
  readonly news: readonly string[];
  /** The items under «Correzioni». */
  readonly fixes: readonly string[];
}

/** One entry of the changelog: its heading `## <version> — <date>` and the lines under it. */
export interface ChangelogEntry {
  /** The heading after `## `, as written. */
  readonly title: string;
  /** The part of the title before the em dash; the whole title when it has none. */
  readonly version: string;
  /** The part of the title after the em dash; empty when it has none. */
  readonly date: string;
  /** The lines up to the next entry. */
  readonly lines: readonly string[];
}

const ENTRY_HEADING = '## ';
const SECTION_HEADING = '### ';
const ITEM = '- ';

/** The section headings an entry lists its changes under. */
export const SECTION_HEADINGS = { news: 'Novità', fixes: 'Correzioni' } as const;

/** The entries of `changelog`, the most recent first. */
export function changelogEntries(changelog: string): ChangelogEntry[] {
  const entries: { title: string; lines: string[] }[] = [];
  for (const line of changelog.split(/\r?\n/)) {
    if (line.startsWith(ENTRY_HEADING) && line.length > ENTRY_HEADING.length)
      entries.push({ title: line.slice(ENTRY_HEADING.length), lines: [] });
    else entries.at(-1)?.lines.push(line);
  }
  return entries.map(({ title, lines }) => {
    const [version = '', date = ''] = title.split('—').map((part) => part.trim());
    return { title, version, date, lines };
  });
}

/**
 * The items of `entry` under «Novità» and «Correzioni», an item wrapped on indented lines joined
 * back into one.
 */
export function changesOf(entry: ChangelogEntry): ReleaseChanges {
  const changes = { news: [] as string[], fixes: [] as string[] };
  const listOfHeading = new Map<string, string[]>([
    [SECTION_HEADINGS.news, changes.news],
    [SECTION_HEADINGS.fixes, changes.fixes],
  ]);
  let items: string[] | undefined;
  let isInItem = false;
  for (const line of entry.lines) {
    if (line.startsWith(SECTION_HEADING)) {
      items = listOfHeading.get(line.slice(SECTION_HEADING.length).trim());
      isInItem = false;
    } else if (line.startsWith(ITEM)) {
      const item = line.slice(ITEM.length).trim();
      isInItem = item !== '' && items !== undefined;
      if (isInItem) items?.push(item);
    } else if (isInItem && /^\s+\S/.test(line) && items)
      items.push(`${items.pop() ?? ''} ${line.trim()}`);
    else isInItem = false;
  }
  return changes;
}

/**
 * The changes of release `version`, read from its entry in `changelog`: empty when the
 * changelog has no entry for it yet.
 */
export function releaseChangesOf(changelog: string, version: string): ReleaseChanges {
  const entry = changelogEntries(changelog).find((candidate) => candidate.version === version);
  return entry ? changesOf(entry) : { news: [], fixes: [] };
}
