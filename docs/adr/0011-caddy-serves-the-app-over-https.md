# 0011: Caddy serves the app over HTTPS, the same compose on staging and production

**Status:** accepted (2026-11-11)

## Decision

The `web` service is Caddy. It serves the built SPA, forwards `/api` to the `api` service, and gets its own TLS certificates. Staging and production run the same `compose.yaml`; only the `.env` differs (site address, listen address, database password). On staging the site address is `localhost`, and Caddy signs its certificate with its own local CA.

## Why

- Issue #1 asks for one Docker composition on staging and production, with a reverse proxy that handles TLS by itself.
- Caddy obtains and renews certificates with no extra service or cron job, and its local CA gives staging real HTTPS, so staging also checks the HTTP-to-HTTPS redirect and HTTP/2.
- Caddy replaces nginx instead of sitting in front of it: one process serves the files and the proxy, so there is one fewer hop and one config file.
- **Alternatives rejected:**
  - nginx with certbot: a second container and a renewal job to keep alive.
  - Caddy in front of the nginx `web` image: two proxies for one small app.

## Consequences

- Browsers distrust the local CA until its root certificate is imported; `docs/staging.md` says how.
- The `caddy-data` volume holds the certificates: losing it in production asks Let's Encrypt again, which has rate limits.
- Staging takes the standard HTTP and HTTPS ports on this machine, like production on its host.
