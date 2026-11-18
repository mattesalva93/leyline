// Caddy starts a new access log file every day and deletes each one after 14 days.
import { ACCESS_LOG } from './access-log.js';
import { execInService } from './compose-stack.js';

/** Caddy's admin API, which listens inside the container only. */
const LOGGING_CONFIG_URL = 'http://127.0.0.1:2019/config/logging/logs';
const KEPT_FOR_DAYS = 14;
const CADDY_DEFAULT_KEPT_FILES = 10;
const ONE_DAY_NS = 24 * 60 * 60 * 1e9;

export async function accessLogRotationFailures() {
  const loggers = JSON.parse(await execInService('web', 'wget', '-qO-', LOGGING_CONFIG_URL));
  const writer = Object.values(loggers).find(
    (logger) => logger.writer?.filename === ACCESS_LOG,
  )?.writer;
  if (!writer) return [`no logger writes ${ACCESS_LOG}`];
  const failures = [];
  if (writer.roll === false) failures.push('the access log never rotates');
  if (writer.roll_interval !== ONE_DAY_NS)
    failures.push(
      `the access log rotates every ${writer.roll_interval ?? 'size limit only'}, expected every day (${ONE_DAY_NS} ns)`,
    );
  if (writer.roll_keep_days !== KEPT_FOR_DAYS)
    failures.push(
      `the access log is kept ${writer.roll_keep_days} days, expected ${KEPT_FOR_DAYS}`,
    );
  // Past its cap on files (Caddy's default when unset), Caddy deletes the oldest before its age.
  const keptFiles = writer.roll_keep ?? CADDY_DEFAULT_KEPT_FILES;
  if (keptFiles < KEPT_FOR_DAYS)
    failures.push(
      `the access log keeps ${keptFiles} files, fewer than its ${KEPT_FOR_DAYS} daily ones`,
    );
  return failures;
}
