import { healthchecksCheckIn } from './healthchecks-check-in.ts';
import { silentImportCheckIn, type ImportCheckIn } from './import-check-in.ts';

/**
 * The importer's check-in (ADR 0027): a ping to the Healthchecks.io check that
 * `HEALTHCHECKS_PING_URL` names, else one that sends nothing.
 */
export function importCheckInFromEnv(
  env: NodeJS.ProcessEnv = process.env,
  stop?: AbortSignal,
): ImportCheckIn {
  const pingUrl = env.HEALTHCHECKS_PING_URL?.trim().replace(/\/$/, '');
  if (!pingUrl) return silentImportCheckIn;
  return healthchecksCheckIn(pingUrl, stop);
}
