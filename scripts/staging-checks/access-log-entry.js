// Which full addresses in an access log line belong to a client. A client also writes what it
// asks for, and an address there is a path or the server's own, never its own address leaking:
// a scanner asking for the site by IP must not fail the check. Every other field is scanned, so a
// field a future Caddy adds is covered too.
import { unmaskedIpAddresses } from './unmasked-ip-addresses.js';

/** Where the client names the resource it asks for. */
const REQUESTED_RESOURCE_FIELDS = [
  ['request', 'uri'],
  ['request', 'host'],
  ['request', 'tls', 'server_name'],
];

function deleteField(entry, [...parents]) {
  const name = parents.pop();
  const holder = parents.reduce((object, key) => object?.[key], entry);
  if (holder) Reflect.deleteProperty(holder, name);
}

/** The full addresses in the line, outside what the client named as the resource it asks for. */
export function unmaskedClientAddresses(line) {
  let entry;
  try {
    entry = JSON.parse(line);
  } catch {
    return unmaskedIpAddresses(line);
  }
  for (const field of REQUESTED_RESOURCE_FIELDS) deleteField(entry, field);
  return unmaskedIpAddresses(JSON.stringify(entry));
}
