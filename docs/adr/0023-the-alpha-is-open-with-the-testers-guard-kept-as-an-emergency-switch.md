# 0023: The alpha is open, with the testers' guard kept as an emergency switch

**Status:** accepted (2026-11-24); supersedes in part ADR 0016: access

## Decision

- The public site, the page and `/api`, is open to anyone.
- Caddy's `basic_auth` with an `argon2id` credential per tester stays configured, but is on only while the secret holding the credentials is not empty. Filling the secret and deploying again closes the site; emptying it opens it again.
- The API rate-limits every route per client address, and answers `503` at once to requests past a global cap on requests in flight, instead of queueing them.
- The site no longer asks search engines to stay out of their index.
- The alpha is served on a cheap domain bought for one year, with a regular Let's Encrypt certificate.

The rest of ADR 0016's baseline stays in force: headers, CSP, database roles, containers, logs and EU hosting.

The thresholds are pinned by the API's HTTP tests in `packages/api/src/http/request-defences.test.ts`: "answers 503 instead of queueing past the concurrency cap", the per-route rate limit tests, and "stays under every rate limit and the concurrency cap within one minute" for a tester's normal use. `pnpm check:staging --access open|closed` pins both states of the guard on the running stack (`scripts/staging-checks/tester-access.js`).

## Why

- The repository is public, so the SPA holds nothing to hide.
- The API reads with a read-only role, so whoever attacks it cannot change the catalogue.
- The catalogue comes from Scryfall, which gives it away in bulk, so scraping it has little motive.
- Abuse from many addresses cannot be prevented without a CDN or a WAF, which would need a domain of their own, but it can be contained: the global cap keeps the VPS from saturating, and the guard comes back on with a deploy.
- The app's scope justifies only a domain of a few euros: the common `leyline.<tld>` names are taken, and a bought domain avoids the rules of free services (`dedyn.io` registrations suspended, dynv6 accounts liable to deletion when the IP never changes).

## Considered options

- **Keep the alpha closed** (ADR 0016).
- **The frontend on GitHub Pages**: rejected, it would bring GitHub (USA) into the privacy notice for every visit and allows no security headers.
- **Remove the guard altogether and bring it back with a pull request**: too slow exactly when it is needed.
- **A Let's Encrypt certificate for the IP address**: no name, and Caddy's `shortlived` profile is experimental.
- **`sslip.io` or `nip.io`**: outside the Public Suffix List, with a certificate rate limit shared by everyone.
- **Free subdomains (deSEC, dynv6, `eu.org`)**: registrations suspended, risk of deletion, or slow manual approval.
- **A new rebranding, for a domain identical to the name**: too costly for an address.
- **An open alpha with the guard as an emergency switch, on a bought domain** (chosen).

## Consequences

- Changing the domain makes testers lose what the app saved on their device, which is tied to the site's address.
- The privacy notice describes the open site and says when the testers' credentials apply.
- `pnpm check:staging` checks the site in both states of the guard.
- The public release no longer has a guard to remove.
