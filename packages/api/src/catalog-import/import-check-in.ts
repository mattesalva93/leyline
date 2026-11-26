export type ImportOutcome = 'succeeded' | 'failed';

/**
 * Tells the outside monitor how an import ended (ADR 0027), so it raises an alert when imports
 * fail or stop. It is handed the outcome alone: nothing of the catalog or the host.
 */
export type ImportCheckIn = (outcome: ImportOutcome) => Promise<void>;

/** The check-in while monitoring is off: it sends nothing. */
export const silentImportCheckIn: ImportCheckIn = async () => {};
