import type { HttpBindings } from '@hono/node-server';
import type { Context } from 'hono';
import { isIPv4 } from 'node:net';
import type { RequestFacts } from './security-log.ts';

const IPV4_MAPPED_PREFIX = '::ffff:';

/**
 * The /24 network of an IPv4 address, as Caddy's `ip_mask` writes it: enough to tell clients
 * apart in a log, too little to name a household. `null` for anything else, since the alpha is
 * published over IPv4 only (ADR 0016).
 */
function maskAddress(address: string): string | null {
  const unmapped = address.startsWith(IPV4_MAPPED_PREFIX)
    ? address.slice(IPV4_MAPPED_PREFIX.length)
    : address;
  return isIPv4(unmapped) ? `${unmapped.split('.').slice(0, 3).join('.')}.0` : null;
}

/**
 * What a security event says of a request: its method, its path and the masked network of the
 * connection's peer, `null` off a Node socket (`app.request`).
 */
export function requestFacts(c: Context<{ Bindings: Partial<HttpBindings> }>): RequestFacts {
  const address = c.env?.incoming?.socket.remoteAddress;
  return {
    method: c.req.method,
    path: c.req.path,
    clientNetwork: address === undefined ? null : maskAddress(address),
  };
}
