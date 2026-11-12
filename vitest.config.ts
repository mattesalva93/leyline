import { readdirSync } from 'node:fs';
import { configDefaults, defineConfig } from 'vitest/config';

/** Packages whose tests mount React components: they need a DOM and the browser's entry of `core`. */
const browserPackages: Record<string, object> = {
  web: {
    resolve: { conditions: ['source', 'module', 'browser', 'development|production'] },
    test: { environment: 'jsdom', setupFiles: ['src/test-setup.ts'] },
  },
};

// One project per workspace package, like the `packages/*` glob.
const packages = readdirSync('packages', { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

export default defineConfig({
  // Import workspace packages from their sources (`source` export condition), not a stale
  // `dist/`. The rest is Vite's default server conditions, which this option replaces.
  ssr: { resolve: { conditions: ['source', 'module', 'node', 'development|production'] } },
  test: {
    // Inline projects with `extends: true` inherit the root options below;
    // projects found by a glob would not.
    projects: [
      ...packages.map((name) => {
        const { resolve, test } = browserPackages[name] ?? {};
        return {
          extends: true,
          root: `packages/${name}`,
          ...(resolve && { resolve }),
          test: { name: `@mtg-suite/${name}`, ...test },
        };
      }),
      // Repo tooling, such as the git hook checks.
      { extends: true, root: 'scripts', test: { name: 'scripts' } },
    ],
    // `tsc -b` also compiles test files into `dist/`: run only the sources.
    exclude: [...configDefaults.exclude, '**/dist/**'],
  },
});
