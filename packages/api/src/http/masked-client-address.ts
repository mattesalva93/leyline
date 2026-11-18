import type { HttpBindings } from '@hono/node-server';
import type { Context } from 'hono';
import { isIPv4 } from 'node:net';

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

/** The masked network of the connection's peer, or `null` off a Node socket (`app.request`). */
export function maskedClientAddress(
  c: Context<{ Bindings: Partial<HttpBindings> }>,
): string | null {
  const address = c.env?.incoming?.socket.remoteAddress;
  return address === undefined ? null : maskAddress(address);
}
