/**
 * Reports the browser's uncaught errors to Bugsink (ADR 0027), once the build has a DSN. The
 * DSN is read here, in the condition itself, so that a bundle built without one drops the SDK.
 */
export async function reportErrors(): Promise<void> {
  const dsn = import.meta.env.VITE_BUGSINK_DSN;
  if (!dsn) return;
  const { startErrorReportingSdk } = await import('./error-reporting-sdk.ts');
  startErrorReportingSdk(dsn);
}
