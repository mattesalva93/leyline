import { serve } from '@hono/node-server';
import { createApp } from './http/app.ts';
import { systemClock } from './http/clock.ts';
import { stdoutSecurityLog } from './http/security-log.ts';
import { connect } from './catalog/db.ts';
import { readerDatabaseUrl } from './env.ts';

// The importer migrates the database; the API only reads it (ADR 0016).
const sql = connect(readerDatabaseUrl());

// Loopback by default; Docker Compose sets HOST=0.0.0.0 inside the container.
const hostname = process.env.HOST ?? '127.0.0.1';
const port = Number(process.env.PORT ?? 3000);
// Docker Compose names Caddy's service here; `pnpm dev` has no proxy in front, so it trusts none.
const trustedProxyHost = process.env.TRUSTED_PROXY_HOST ?? null;
const server = serve(
  {
    fetch: createApp({
      sql,
      clock: systemClock,
      securityLog: stdoutSecurityLog(systemClock),
      trustedProxyHost,
    }).fetch,
    hostname,
    port,
  },
  () => {
    console.log(`api listening on http://${hostname}:${port}`);
  },
);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    server.close();
    void sql.end();
  });
}
