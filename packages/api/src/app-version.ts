import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The repository's root, three folders up from `src/` and from `dist/` alike. The api's image
 * keeps the repository's layout around the api, so the root `package.json` is there too.
 */
const REPOSITORY_ROOT = join(import.meta.dirname, '../../..');

/** The app version, which lives in the root package.json only (ADR 0025). */
export function appVersion(): string {
  const packageJson = readFileSync(join(REPOSITORY_ROOT, 'package.json'), 'utf8');
  const { version } = JSON.parse(packageJson) as { version?: unknown };
  if (typeof version !== 'string') throw new Error('The root package.json has no version.');
  return version;
}
