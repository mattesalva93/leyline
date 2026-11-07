import { readdirSync } from 'node:fs';
import { configDefaults, defineConfig } from 'vitest/config';

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
    projects: packages.map((name) => ({
      extends: true,
      root: `packages/${name}`,
      test: { name: `@mtg-suite/${name}` },
    })),
    // `tsc -b` also compiles test files into `dist/`: run only the sources.
    exclude: [...configDefaults.exclude, '**/dist/**'],
  },
});
