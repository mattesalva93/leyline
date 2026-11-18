import { serve } from '@hono/node-server';
import { createApp } from './http/app.ts';
import { connect, migrate } from './catalog/db.ts';
import { databaseUrl } from './env.ts';

const sql = connect(databaseUrl());
await migrate(sql);

// Loopback by default; Docker Compose sets HOST=0.0.0.0 inside the container.
const hostname = process.env.HOST ?? '127.0.0.1';
const port = Number(process.env.PORT ?? 3000);
const server = serve({ fetch: createApp({ sql }).fetch, hostname, port }, () => {
  console.log(`api listening on http://${hostname}:${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    server.close();
    void sql.end();
  });
}
