import type { HttpBindings } from '@hono/node-server';
import type { Context, MiddlewareHandler } from 'hono';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import type { Clock } from './clock.ts';

declare module 'hono' {
  interface ContextVariableMap {
    /** Set by `clientAddress()`; read it through `clientAddressOf`. */
    clientAddress: string | null;
  }
}

const IPV4_MAPPED_PREFIX = '::ffff:';

/** How long a resolved proxy address is believed before a peer it does not match asks again. */
const PROXY_ADDRESS_RECHECK_SECONDS = 10;

/** An IPv4 address as itself, also when a dual-stack socket reports it IPv6-mapped. */
function unmapped(address: string): string {
  return address.startsWith(IPV4_MAPPED_PREFIX)
    ? address.slice(IPV4_MAPPED_PREFIX.length)
    : address;
}

/**
 * Whether a peer is the host named `trustedProxyHost`, looked up in DNS: Docker gives Caddy's
 * container a new address whenever it is recreated, so the name is what stays. A peer that does
 * not match looks the name up again, at most once every `PROXY_ADDRESS_RECHECK_SECONDS`.
 */
function trustedProxyCheck(
  trustedProxyHost: string | null,
  clock: Clock,
): (peer: string) => Promise<boolean> {
  if (trustedProxyHost === null) return () => Promise.resolve(false);
  let addresses: Promise<ReadonlySet<string>> | undefined;
  let lookedUpAt = 0;
  const lookUp = () => {
    lookedUpAt = clock.now().getTime();
    addresses = lookup(trustedProxyHost, { all: true }).then(
      (found) => new Set(found.map(({ address }) => unmapped(address))),
      // Not resolvable yet, as when Caddy starts after the API: nobody is trusted until it is.
      () => new Set(),
    );
    return addresses;
  };
  return async (peer) => {
    if ((await (addresses ?? lookUp())).has(peer)) return true;
    if (clock.now().getTime() - lookedUpAt < PROXY_ADDRESS_RECHECK_SECONDS * 1000) return false;
    return (await lookUp()).has(peer);
  };
}

/** The client address the trusted proxy forwards: the last one, which it appended itself. */
function forwardedClient(forwardedFor: string | undefined): string | null {
  const last = forwardedFor?.split(',').at(-1)?.trim();
  return last !== undefined && isIP(last) !== 0 ? unmapped(last) : null;
}

/**
 * Finds the client's address: the one `X-Forwarded-For` names when the connection comes from
 * the trusted proxy, otherwise the connection's own, so a client cannot choose it by writing the
 * header. `null` off a Node socket (`app.request`).
 */
export function clientAddress(
  trustedProxyHost: string | null,
  clock: Clock,
): MiddlewareHandler<{ Bindings: Partial<HttpBindings> }> {
  const isTrustedProxy = trustedProxyCheck(trustedProxyHost, clock);
  return async (c, next) => {
    const socketAddress = c.env?.incoming?.socket.remoteAddress;
    const peer = socketAddress === undefined ? null : unmapped(socketAddress);
    const forwarded =
      peer !== null && (await isTrustedProxy(peer))
        ? forwardedClient(c.req.header('x-forwarded-for'))
        : null;
    c.set('clientAddress', forwarded ?? peer);
    await next();
  };
}

/** The address `clientAddress()` found, `null` when it has not run or found none. */
export function clientAddressOf(c: Context): string | null {
  return c.get('clientAddress') ?? null;
}
