import type { ErrorReporter } from '../error-reporting/error-reporter.ts';

/** An error reporter that keeps what it is handed, for a test to read. */
interface RecordedErrorReporter extends ErrorReporter {
  readonly reported: Error[];
}

export function recordedErrorReporter(): RecordedErrorReporter {
  const reported: Error[] = [];
  return { reported, report: (error) => reported.push(error) };
}
