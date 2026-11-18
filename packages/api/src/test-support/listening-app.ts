import { serve } from '@hono/node-server';
import type { AddressInfo } from 'node:net';
import type { Hono } from 'hono';

export interface ListeningApp {
  /** The origin the app answers on, such as `http://127.0.0.1:41234`. */
  readonly origin: string;
  close(): Promise<void>;
}

/** Serves `app` on a free loopback port, as `server.ts` does, so requests come over a real socket. */
export function listen(app: Hono): Promise<ListeningApp> {
  return new Promise((resolve) => {
    const server = serve(
      { fetch: app.fetch, hostname: '127.0.0.1', port: 0 },
      (info: AddressInfo) => {
        resolve({
          origin: `http://127.0.0.1:${info.port}`,
          close: () => new Promise((closed) => server.close(() => closed())),
        });
      },
    );
  });
}
