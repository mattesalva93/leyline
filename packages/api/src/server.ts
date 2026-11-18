import { serve } from '@hono/node-server';
import { createApp } from './http/app.ts';
import { systemClock } from './http/clock.ts';
import { stdoutSecurityLog } from './http/security-log.ts';
import { connect } from './catalog/db.ts';
import { databaseUrl } from './env.ts';

// The importer migrates the database; the API only reads it (ADR 0016).
const sql = connect(databaseUrl());

// Loopback by default; Docker Compose sets HOST=0.0.0.0 inside the container.
const hostname = process.env.HOST ?? '127.0.0.1';
const port = Number(process.env.PORT ?? 3000);
const server = serve(
  {
    fetch: createApp({ sql, clock: systemClock, securityLog: stdoutSecurityLog(systemClock) })
      .fetch,
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
