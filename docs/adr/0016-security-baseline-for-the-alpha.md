# 0016: Security baseline for the alpha

**Status:** accepted (2026-11-18)

## Decision

The closed alpha meets **OWASP ASVS 5.0 level L2** on the chapters that apply today: V1–V4 and V12–V16. V6–V10 (authentication, sessions, authorization, tokens, OAuth) and V17 (WebRTC) do not apply while access stays as below.

- **Access.** Caddy's `basic_auth` guards the whole public site, the SPA and `/api` alike. The owner generates one long random credential per tester and stores only its `argon2id` hash; the hashes live in a GitHub secret, never in the repository, and a tester is revoked by removing their line and deploying again. Caddy's internal health server stays outside the guard.
- **API.** The API defends itself even behind the guard: a body limit checked before reading, a timeout per request, a per-IP rate limit on search and resolution that trusts the forwarded client address only from Caddy, explicit validation of every input, and a generic 500. It logs security events without full IP addresses.
- **Database.** Two roles besides the superuser that initialises PostgreSQL: `mtg_owner` owns the schema, runs the migrations and is the importer's; `mtg_reader` can only read, has a statement timeout, and is the API's. The API no longer migrates on start.
- **Headers and CSP.** Caddy sends HSTS without `preload`, `nosniff`, `Referrer-Policy: no-referrer`, a restrictive `Permissions-Policy`, `Cross-Origin-Opener-Policy: same-origin` and a CSP that forbids framing and limits scripts to the site's own. No `Cross-Origin-Embedder-Policy`. Styles alone may be inline.
- **Logs.** Caddy's access logs mask the client address and are rotated and kept for a short, fixed time; every container's log rotates.
- **Containers.** Every service runs as a non-root user, on a read-only filesystem with `tmpfs` only where it writes, with every Linux capability dropped except those it needs, `no-new-privileges`, memory and CPU limits, and base images pinned by digest. PostgreSQL sits on an internal network that is never published.
- **Hosting.** The alpha runs on an OVHcloud VPS in an EU data centre, published over IPv4 only.

The values live in `docker/web/Caddyfile`, `compose.yaml` and the API's code. `pnpm check:staging` pins what lives in the configuration, on the running stack, and the API's HTTP tests pin its defences.

## Why

- The site goes online for a few chosen testers. Its host name reaches the public Certificate Transparency logs as soon as Caddy gets a certificate, so an unadvertised address is no access control (`research/security-baseline.md`).
- A declared level can be checked requirement by requirement; L2 is the level ASVS says most applications should strive for.
- `basic_auth` needs no application code and covers the SPA and the API at once. Credentials the owner assigns remove the main risk of HTTP basic authentication, passwords reused from other services.
- Scryfall's terms say "end-users should be able to access card data anonymously or with free accounts". The guard asks for no payment and no sign-up, and lasts only as long as the closed alpha; the public release drops it.
- Without COEP Scryfall's images load: they send no `Cross-Origin-Resource-Policy`, and the app needs no cross-origin isolation. Radix inserts styles at run time, and a static site cannot issue a nonce, hence inline styles only.
- HSTS without `preload` keeps the domain free to change during the alpha.
- A read-only role for the API means its compromise cannot change the catalogue, which is rebuilt from Scryfall anyway.
- OVHcloud's VPS fits the budget, signs a data processing agreement in the EU and lets the alpha grow with the same provider (`research/vps-alpha-hosting.md`).

## Considered options

- **An unadvertised address with `noindex`**: no protection, the name is public.
- **An IP allowlist**: testers on mobile networks change address.
- **Invitation tokens in a cookie, or `forward_auth` to a gateway**: application code or a second service for a temporary guard.
- **Caddy's `basic_auth` with assigned credentials** (chosen).
- **Security headers set by Hono's `secureHeaders()`**: they would cover only `/api`, and its HSTS default is below ASVS's minimum; Caddy sets them once for every response.

## Consequences

- Staging and the VPS are checked the same way: `pnpm check:staging --app <url>` after every deploy.
- A banner from an ad network (ADR 0005) would need the CSP opened to its origins.
- If building the images on the VPS needs more memory than it has, ADR 0012 is reopened.
