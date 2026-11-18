import type { Context } from 'hono';
import { isIPv4 } from 'node:net';
import { clientAddressOf } from './client-address.ts';
import type { RequestFacts } from './security-log.ts';

/**
 * The /24 network of an IPv4 address, as Caddy's `ip_mask` writes it: enough to tell clients
 * apart in a log, too little to name a household. `null` for anything else, since the alpha is
 * published over IPv4 only (ADR 0016).
 */
function maskAddress(address: string): string | null {
  return isIPv4(address) ? `${address.split('.').slice(0, 3).join('.')}.0` : null;
}

/**
 * What a security event says of a request: its method, its path and the masked network of the
 * client, the one behind the trusted proxy (`client-address.ts`), `null` when none is known.
 */
export function requestFacts(c: Context): RequestFacts {
  const address = clientAddressOf(c);
  return {
    method: c.req.method,
    path: c.req.path,
    clientNetwork: address === null ? null : maskAddress(address),
  };
}
