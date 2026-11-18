import type { Hono } from 'hono';
import type { Sql } from '../catalog/db.ts';
import { createApp } from '../http/app.ts';
import { systemClock } from '../http/clock.ts';
import { recordedSecurityLog } from './recorded-security-log.ts';

/** The app on `sql`, with the real clock, a security log nobody reads and no trusted proxy. */
export function testApp(sql: Sql): Hono {
  return createApp({
    sql,
    clock: systemClock,
    securityLog: recordedSecurityLog(),
    trustedProxyHost: null,
  });
}
