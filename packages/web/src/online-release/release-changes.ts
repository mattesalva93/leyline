/** What a release changes for testers, as its changelog entry lists it (ADR 0025). */
export interface ReleaseChanges {
  /** The items under «Novità». */
  readonly news: readonly string[];
  /** The items under «Correzioni». */
  readonly fixes: readonly string[];
}

const SECTION_OF_HEADING: Record<string, keyof ReleaseChanges> = {
  Novità: 'news',
  Correzioni: 'fixes',
};

/** The lines of the entry `## <version> — <date>`, up to the next entry; empty when there is none. */
function entryLines(changelog: string, version: string): string[] {
  const lines = changelog.split(/\r?\n/);
  const start = lines.findIndex(
    (line) => line.startsWith('## ') && line.slice(3).split('—')[0]?.trim() === version,
  );
  if (start === -1) return [];
  const end = lines.findIndex((line, index) => index > start && line.startsWith('## '));
  return lines.slice(start + 1, end === -1 ? undefined : end);
}

/**
 * The changes of release `version`, read from its entry in `changelog`: empty when the
 * changelog has no entry for it yet.
 */
export function releaseChangesOf(changelog: string, version: string): ReleaseChanges {
  const changes = { news: [] as string[], fixes: [] as string[] };
  let items: string[] | undefined;
  for (const line of entryLines(changelog, version)) {
    if (line.startsWith('### ')) {
      const section = SECTION_OF_HEADING[line.slice(4).trim()];
      items = section && changes[section];
    } else if (line.startsWith('- ')) items?.push(line.slice(2).trim());
    else if (/^\s+\S/.test(line) && items && items.length > 0)
      items.push(`${items.pop() ?? ''} ${line.trim()}`);
  }
  return changes;
}
