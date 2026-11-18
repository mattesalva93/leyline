// Recognises a full client address, as opposed to one Caddy masked to its network.
import { isIPv4, isIPv6 } from 'node:net';

const IPV4_CANDIDATE = /\b\d{1,3}(?:\.\d{1,3}){3}\b/g;
const IPV6_CANDIDATE = /[\da-f]*(?::[\da-f]*){2,}/gi;

/** The address's eight 16-bit groups, with `::` filled in. */
function ipv6Groups(address) {
  const [head, tail] = address.split('::').map((part) => (part ? part.split(':') : []));
  const missing = 8 - head.length - (tail?.length ?? 0);
  return [...head, ...Array(tail ? missing : 0).fill('0'), ...(tail ?? [])].map((group) =>
    Number.parseInt(group, 16),
  );
}

/** The interface identifier is the last 64 bits, the four groups past the /64 network. */
function keepsInterfaceIdentifier(address) {
  return ipv6Groups(address)
    .slice(4)
    .some((group) => group !== 0);
}

/** Every client address in the text that keeps more than its network part. */
export function unmaskedIpAddresses(text) {
  const ipv4 = [...text.matchAll(IPV4_CANDIDATE)]
    .map(([candidate]) => candidate)
    .filter((address) => isIPv4(address) && !address.endsWith('.0'));
  const ipv6 = [...text.matchAll(IPV6_CANDIDATE)]
    .map(([candidate]) => candidate)
    .filter((address) => isIPv6(address) && keepsInterfaceIdentifier(address));
  return [...ipv4, ...ipv6];
}
