import { describe, expect, it } from 'vitest';
import { unmaskedIpAddresses } from './unmasked-ip-addresses.js';

describe('unmaskedIpAddresses', () => {
  it('finds an IPv4 address whose last octet is kept', () => {
    expect(unmaskedIpAddresses('{"remote_ip":"203.0.113.77"}')).toEqual(['203.0.113.77']);
  });

  it('accepts an IPv4 address masked to its /24 network', () => {
    expect(unmaskedIpAddresses('{"remote_ip":"203.0.113.0"}')).toEqual([]);
  });

  it('finds an IPv6 address whose interface identifier is kept', () => {
    expect(unmaskedIpAddresses('{"client_ip":"2001:db8:1:2:3:4:5:6"}')).toEqual([
      '2001:db8:1:2:3:4:5:6',
    ]);
  });

  it('accepts an IPv6 address masked to its /64 network', () => {
    expect(unmaskedIpAddresses('{"client_ip":"2001:db8:1:2::"}')).toEqual([]);
  });

  it('finds a compressed IPv6 address that keeps its interface identifier', () => {
    expect(unmaskedIpAddresses('{"client_ip":"2001:db8::1"}')).toEqual(['2001:db8::1']);
  });

  it('ignores clock times, which look like colon-separated numbers', () => {
    expect(unmaskedIpAddresses('{"Date":"Wed, 18 Nov 2026 18:44:29 GMT"}')).toEqual([]);
  });

  it('finds every unmasked address on the line', () => {
    expect(
      unmaskedIpAddresses('{"remote_ip":"203.0.113.0","client_ip":"198.51.100.9","x":"::1"}'),
    ).toEqual(['198.51.100.9', '::1']);
  });
});
