import type { SecurityEvent, SecurityLog } from '../http/security-log.ts';

/** A security log that keeps its events, for a test to read. */
interface RecordedSecurityLog extends SecurityLog {
  readonly events: SecurityEvent[];
}

export function recordedSecurityLog(): RecordedSecurityLog {
  const events: SecurityEvent[] = [];
  return { events, record: (event) => events.push(event) };
}
