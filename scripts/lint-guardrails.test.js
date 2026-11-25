import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const eslint = new ESLint({ cwd: new URL('..', import.meta.url).pathname });

/** The rules the config breaks on `code`, as if it were written at `filePath`. */
async function brokenRules(code, filePath) {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.map((message) => message.ruleId);
}

describe('the Sentry SDK stays inside the error reporting module (ADR 0027)', () => {
  const sentryImport = "import { init } from '@sentry/browser';\nexport { init };\n";

  it('fails an import of @sentry/* anywhere else in web', async () => {
    expect(await brokenRules(sentryImport, 'packages/web/src/GeneratorPage.tsx')).toContain(
      'no-restricted-imports',
    );
  });

  it('lets the error reporting module import it', async () => {
    expect(
      await brokenRules(sentryImport, 'packages/web/src/error-reporting/error-reporting-sdk.ts'),
    ).not.toContain('no-restricted-imports');
  });

  it('still keeps the error reporting module from importing api', async () => {
    expect(
      await brokenRules(
        "import { x } from '@leyline/api';\nexport { x };\n",
        'packages/web/src/error-reporting/error-reporting-sdk.ts',
      ),
    ).toContain('no-restricted-imports');
  });
});
