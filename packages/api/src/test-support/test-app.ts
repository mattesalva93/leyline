import type { Hono } from 'hono';
import type { Sql } from '../catalog/db.ts';
import { createApp, type AppDeps } from '../http/app.ts';
import { systemClock } from '../http/clock.ts';
import { recordedSecurityLog } from './recorded-security-log.ts';

/** The app on `sql`, with the real clock and a log nobody reads unless the test passes its own. */
export function testApp(sql: Sql, deps: Partial<Omit<AppDeps, 'sql'>> = {}): Hono {
  return createApp({ sql, clock: systemClock, securityLog: recordedSecurityLog(), ...deps });
}
