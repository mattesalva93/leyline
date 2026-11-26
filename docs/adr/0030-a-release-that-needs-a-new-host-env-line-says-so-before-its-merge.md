# 0030: A release that needs a new line in the host's .env says so before its merge

**Status:** accepted (2026-11-26)

## Decision

- **A pull request to `main` whose `compose.yaml` requires a variable `main`'s does not** names each one in its description, on a line of its own, `Host .env: NAME`, once the owner has added it to the host's `.env`. The `host-env-lines` check fails the pull request until it does (`scripts/check-host-env-lines.test.js`).
- **The deploy checks the host's `.env`** against the `compose.yaml` it just copied, before any container changes, and stops naming what is missing.
- Neither writes the host's `.env`: it is set up and changed by hand only (ADR 0012).

## Why

- On 2026-11-26 the release of spec #214 failed to deploy: `compose.yaml` had come to require Umami's password and secret, and production's `.env`, written before Umami, had neither. The site stayed on the previous release until the lines were added by hand.
- Only the owner can add a line to the host's `.env`, and only before the merge does that keep the deploy from failing: once merged, the release deploys at once (ADR 0012). CI cannot read the host's `.env`, so the pull request asks the owner instead, as `spec-release-readme` does for the README (ADR 0024).
- The deploy's check stays for what the description cannot catch, such as a line removed from the host by hand, and fails before the site changes rather than halfway through.

## Considered options

- **The deploy check alone**: rejected; it reports the missing line, but only after the merge, with the deploy already failed.
- **The deploy generating the missing values on the host**: rejected; only random secrets could be made up, and a variable such as the site's address or a password PostgreSQL already holds must come from the owner.
- **A list of the host's variables kept apart from `compose.yaml`**: rejected; `compose.yaml` already says which variables it cannot start without, and a second list would drift.
