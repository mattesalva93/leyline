import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';
import type { OnlineRelease } from './src/online-release/online-release.ts';
import { VERSION_FILE } from './src/online-release/online-release.ts';
import { releaseChangesOf } from './src/online-release/release-changes.ts';

const REPOSITORY_ROOT = join(import.meta.dirname, '../..');

/** The app version, which lives in the root package.json only. */
function rootAppVersion(): string {
  const packageJson = readFileSync(join(REPOSITORY_ROOT, 'package.json'), 'utf8');
  const { version } = JSON.parse(packageJson) as { version?: unknown };
  if (typeof version !== 'string') throw new Error('The root package.json has no version.');
  return version;
}

/**
 * Builds the app's version in as `import.meta.env.APP_VERSION`, and serves it as
 * `/version.json` from the dev server and from the built `dist`, with the changes its
 * changelog entry lists.
 */
export function appVersion(): Plugin {
  const version = rootAppVersion();
  const changelog = readFileSync(join(REPOSITORY_ROOT, 'CHANGELOG.md'), 'utf8');
  const release: OnlineRelease = { version, ...releaseChangesOf(changelog, version) };
  const source = `${JSON.stringify(release)}\n`;
  return {
    name: 'leyline-app-version',
    config: () => ({ define: { 'import.meta.env.APP_VERSION': JSON.stringify(version) } }),
    configureServer(server) {
      server.middlewares.use(`/${VERSION_FILE}`, (_request, response) => {
        response.setHeader('Content-Type', 'application/json');
        response.setHeader('Cache-Control', 'no-store');
        response.end(source);
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: VERSION_FILE, source });
    },
  };
}
