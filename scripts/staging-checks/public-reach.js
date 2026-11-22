// From outside, the VPS answers on 80 and 443 over IPv4 only, and on 22 for SSH (ADR 0016,
// ADR 0019): its firewall is on, nothing else listens beyond loopback, and the site's name has no
// IPv6 address.
import { resolve6 } from 'node:dns/promises';

const SSH_PORT = '22';
const WEB_PORTS = ['80', '443'];

/** `127.0.0.53%lo:53`, `[::1]:631`: reachable from the host itself only. */
function isLoopback(address) {
  return /^(127\.|\[::1\]|\[::ffff:127\.)/.test(address) || address.includes('%lo');
}

/** `[::]:22` and `*:22` take IPv6 connections; `0.0.0.0:80` and `192.0.2.10:80` do not. */
function takesIpv6(address) {
  return address.startsWith('[') || address.startsWith('*');
}

/** Each listening socket's local address and port, from `ss -H` lines. */
function listeners(ssOutput) {
  return ssOutput
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      // Columns: Netid State Recv-Q Send-Q Local-Address:Port Peer-Address:Port
      const [protocol, , , , local] = line.trim().split(/\s+/);
      return { protocol, address: local, port: local.slice(local.lastIndexOf(':') + 1) };
    })
    .filter(({ address }) => !isLoopback(address));
}

/** UDP beyond 443 is left out: the host's DHCP client listens there, behind the firewall. */
function listenerFailures(ssOutput) {
  const failures = [];
  for (const { protocol, address, port } of listeners(ssOutput)) {
    const isWeb = WEB_PORTS.includes(port);
    if (protocol === 'tcp' && !isWeb && port !== SSH_PORT)
      failures.push(`${address} (tcp) listens beyond loopback`);
    else if (isWeb && takesIpv6(address)) failures.push(`${address} (${protocol}) takes IPv6`);
  }
  return failures;
}

async function ipv6AddressFailures(appAddress) {
  const { hostname } = new URL(appAddress);
  const addresses = await resolve6(hostname).catch((error) => {
    if (error.code === 'ENODATA' || error.code === 'ENOTFOUND') return [];
    throw error;
  });
  return addresses.length > 0 ? [`${hostname} has AAAA records: ${addresses.join(', ')}`] : [];
}

/**
 * @param {{ vps: { run: (command: string) => Promise<string> }, appAddress: string }} staging
 */
export async function publicReachFailures({ vps, appAddress }) {
  // `ss -Hltnu`: listening TCP and UDP sockets, numeric, without the header line. Neither it nor
  // `systemctl is-active` needs root, which the deploy user does not have.
  const firewall = (await vps.run('systemctl is-active ufw || true')).trim();
  return [
    ...(firewall === 'active' ? [] : [`ufw is ${firewall || 'unknown'}, expected active`]),
    ...listenerFailures(await vps.run('ss -Hltnu')),
    ...(await ipv6AddressFailures(appAddress)),
  ];
}
