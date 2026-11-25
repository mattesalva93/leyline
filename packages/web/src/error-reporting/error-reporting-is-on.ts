/** Whether this build reports the browser's errors to Bugsink: its DSN is not empty. */
export function errorReportingIsOn(): boolean {
  return Boolean(import.meta.env.VITE_BUGSINK_DSN);
}
