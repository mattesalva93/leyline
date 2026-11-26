// What the README links to inside the repository, so a test can check each target still exists.

/**
 * A Markdown link or image, `[text](target)` or `![alt](target)` with an optional title, or an
 * HTML `href` or `src`.
 */
const LINK = /\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)|\b(?:href|src)="([^"]+)"/g;

/** A target with a scheme (`https:`, `mailto:`) leaves the repository. */
const ABSOLUTE = /^[a-z][a-z0-9+.-]*:/i;

/** The targets of the Markdown's links and images that point inside the repository. */
export function relativeLinkTargets(markdown) {
  return [...markdown.matchAll(LINK)]
    .map(([, markdownTarget, htmlTarget]) => (markdownTarget ?? htmlTarget).split('#')[0])
    .filter((path) => path !== '' && !ABSOLUTE.test(path));
}
