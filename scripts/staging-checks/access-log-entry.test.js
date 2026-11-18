import { describe, expect, it } from 'vitest';
import { unmaskedClientAddresses } from './access-log-entry.js';

function logLine(request) {
  return JSON.stringify({ msg: 'handled request', request, status: 200 });
}

describe('unmaskedClientAddresses', () => {
  it('finds a full client address', () => {
    expect(unmaskedClientAddresses(logLine({ remote_ip: '203.0.113.77' }))).toEqual([
      '203.0.113.77',
    ]);
  });

  it('ignores an address written in the requested path', () => {
    expect(
      unmaskedClientAddresses(logLine({ remote_ip: '203.0.113.0', uri: '/?u=198.51.100.9' })),
    ).toEqual([]);
  });

  it('ignores the server address a client asks for by IP', () => {
    expect(
      unmaskedClientAddresses(
        logLine({
          remote_ip: '203.0.113.0',
          host: '192.0.2.10',
          tls: { server_name: '192.0.2.10' },
        }),
      ),
    ).toEqual([]);
  });

  it('still finds a full address in any other field', () => {
    expect(
      unmaskedClientAddresses(logLine({ remote_ip: '203.0.113.0', new_field: '198.51.100.9' })),
    ).toEqual(['198.51.100.9']);
  });

  it('scans the whole line when it is not JSON', () => {
    expect(unmaskedClientAddresses('host 192.0.2.10 uri /')).toEqual(['192.0.2.10']);
  });
});
