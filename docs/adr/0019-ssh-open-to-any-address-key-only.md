# 0019: SSH open to any address, with keys only and a rate limit

**Status:** accepted (2026-11-22)

## Decision

The alpha's VPS accepts SSH on port 22 from any address: the provider's firewall, which filters IPv4 only, and `ufw`, which filters both IPv4 and IPv6, let it through. What guards it instead of an address list:

- only public-key authentication: no password, no keyboard-interactive login;
- no login as `root`, and only the admin user and the deploy user may log in at all;
- `ufw limit`, which drops an address that opens too many connections in a short time.

`scripts/vps/prepare-host.sh` sets all of it, and `pnpm check:staging` pins what a client can observe from outside when it runs against the VPS.

## Why

- Issue #139 asks for port 22 open only to allowed addresses, but the deploy runs on GitHub-hosted runners (ADR 0012). Their addresses are thousands of Azure ranges, published at `api.github.com/meta` and changing over time.
- The OVHcloud Edge Network Firewall holds at most 20 rules per IP (`research/vps-alpha-hosting.md`): GitHub's ranges cannot fit there.
- Those ranges are Azure's, shared with anyone who rents a machine there: allowing them would keep out casual scanners, not an attacker.
- With keys only, guessing a password is impossible; the rate limit keeps scanners' noise out of the logs.

## Considered options

- **The owner's addresses plus GitHub's `actions` ranges in `ufw`**, refreshed by a timer on the host: little protection for its moving parts, and a broken refresh stops every deploy.
- **The deploy job opening port 22 for its own address through the OVHcloud API**, closing it afterwards: an API key able to change the firewall among GitHub's secrets, on an API not verified for the VPS range.
- **Open, keys only, rate-limited** (chosen).

## Consequences

- An exploitable flaw in OpenSSH itself would be reachable from anywhere: `unattended-upgrades` installs its security fixes.
- A self-hosted runner or a VPN in front of SSH would let the port close to the world; ADR 0012 rules out the first.
