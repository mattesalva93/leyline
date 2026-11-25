import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';

/** The file a page left open fetches to learn the release online now (ADR 0025). */
const VERSION_FILE = 'version.json';

/** The product's one version, which lives in the root package.json only. */
function rootVersion(): string {
  const packageJson = readFileSync(join(import.meta.dirname, '../../package.json'), 'utf8');
  const { version } = JSON.parse(packageJson) as { version?: unknown };
  if (typeof version !== 'string') throw new Error('The root package.json has no version.');
  return version;
}

/**
 * Builds the app's version in as `import.meta.env.APP_VERSION`, and serves it as
 * `/version.json` from the dev server and from the built `dist`.
 */
export function appVersion(): Plugin {
  const version = rootVersion();
  const source = `${JSON.stringify({ version })}\n`;
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
