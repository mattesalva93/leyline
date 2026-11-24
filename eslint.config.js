// @ts-check
import { fixupPluginRules } from '@eslint/compat';
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Guardrails from ticket #2 and CODING_STANDARDS.md. Each one fails the lint.

/** `core` is pure: no network, file system, process or database access. */
const coreNoIo = {
  files: ['packages/core/**/*.{ts,tsx}'],
  languageOptions: { globals: {} },
  rules: {
    'no-restricted-globals': [
      'error',
      ...['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'process', 'require'].map(
        (name) => ({ name, message: '`core` must not do I/O: receive data as arguments.' }),
      ),
    ],
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            regex: '^node:',
            message: '`core` must not do I/O: no Node built-in modules.',
          },
          {
            regex:
              '^(fs|fs/promises|path|os|net|http|https|http2|child_process|worker_threads|dgram|dns|tls|readline|stream|zlib)$',
            message: '`core` must not do I/O: no Node built-in modules.',
          },
          {
            regex:
              '^(pg|postgres|pg-.*|kysely|drizzle-orm.*|prisma|@prisma/.*|axios|undici|ky|got|hono|hono/.*|@hono/.*)$',
            message: '`core` must not do I/O: no database, HTTP client or HTTP server libraries.',
          },
          {
            regex: '^@leyline/(api|web)(/|$)',
            message: '`core` must not depend on `api` or `web`.',
          },
        ],
      },
    ],
  },
};

/** `web` and `api` share only `core`'s types; they never import each other. */
const webNoApi = {
  files: ['packages/web/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            regex: '^@leyline/api(/|$)|^(\\.\\./)+(packages/)?api(/|$)',
            message: '`web` must not import from `api`: share types through `core`.',
          },
        ],
      },
    ],
  },
};

const apiNoWeb = {
  files: ['packages/api/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            regex: '^@leyline/web(/|$)|^(\\.\\./)+(packages/)?web(/|$)',
            message: '`api` must not import from `web`: share types through `core`.',
          },
        ],
      },
    ],
  },
};

/**
 * `web` UI text goes through the i18n library (i18next), never as a JSX literal.
 * i18next has no official lint rule. The community `eslint-plugin-i18next` (`no-literal-string`)
 * was evaluated (v6.1.5, 2026-11-07): its default `jsx-text-only` mode covers what this rule
 * covers; its `jsx-only` mode also checks attributes, but needs a hand-kept list of non-UI
 * attributes (`className`, `href`, ...). Not worth a dependency for now: kept this rule.
 */
const webNoJsxLiterals = {
  files: ['packages/web/**/*.tsx'],
  // eslint-plugin-react still calls the context methods ESLint 10 removed.
  plugins: { react: fixupPluginRules(react), 'react-hooks': reactHooks },
  languageOptions: { globals: globals.browser },
  settings: { react: { version: 'detect' } },
  rules: {
    ...react.configs.flat.recommended.rules,
    ...react.configs.flat['jsx-runtime'].rules,
    ...reactHooks.configs.recommended.rules,
    'react/jsx-no-literals': [
      'error',
      { noStrings: true, ignoreProps: true, noAttributeStrings: false },
    ],
  },
};

/**
 * An invisible space reads as a plain one: inside a string it must be spelled as an escape
 * (`'\u00a0'`), so the reader sees it.
 */
const noInvisibleWhitespace = {
  rules: {
    'no-irregular-whitespace': [
      'error',
      { skipStrings: false, skipTemplates: false, skipRegExps: false, skipJSXText: false },
    ],
  },
};

export default tseslint.config(
  { ignores: ['**/dist/**', '**/coverage/**', '**/node_modules/**', 'research/**'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ['*.{js,ts}', 'scripts/**/*.js', 'packages/api/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
  coreNoIo,
  webNoApi,
  apiNoWeb,
  webNoJsxLiterals,
  noInvisibleWhitespace,
  prettier,
);
