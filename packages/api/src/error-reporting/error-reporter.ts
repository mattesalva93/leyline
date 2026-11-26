/**
 * Where the api reports an error that became a 500 (ADR 0027). It is handed the error alone:
 * never the request, whose headers and body carry what the tester sent.
 */
export interface ErrorReporter {
  report(error: Error): void;
}

/** The reporter while error reporting is off: it reports nothing. */
export const silentErrorReporter: ErrorReporter = { report: () => {} };
