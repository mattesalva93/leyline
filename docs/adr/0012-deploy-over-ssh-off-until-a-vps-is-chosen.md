# 0012: Deploy over SSH, off until a VPS is chosen

**Status:** accepted (2026-11-11)

## Decision

`.github/workflows/deploy.yml` deploys `main` after CI passes on it, from a GitHub-hosted runner. It copies the tracked files to the host over SSH (`git archive` piped into `tar`) and runs `docker compose up` there, so the host builds the same images staging builds (ADR 0011). The workflow names no provider: the host, user, port and path are repository variables, the SSH key and the pinned host key are secrets of the `production` environment.

The job is skipped until the repository variable `DEPLOY_ENABLED` is `true`. No self-hosted runner is used.

## Why

- Issue #1 asks for a deploy workflow ready but off until the VPS is chosen, independent of the provider, with no self-hosted runner.
- A variable turns it on without a code change, and leaves the workflow file as the one place that says how a deploy runs.
- Copying the sources keeps the private repository's credentials off the host, and building on the host needs no image registry.
- **Alternatives rejected:**
  - Building images in Actions and pushing them to a registry: faster deploys, but a registry login on the host and a second compose shape for production.
  - `git pull` on the host: a deploy key for the repository on the server.

## Consequences

- The host builds on every deploy, so it needs the RAM and disk of a `pnpm install` and a Vite build.
- Files deleted from the repository stay on the host until removed by hand; `tar` only adds and overwrites.
- The host's `.env` (site address, listen address, database password) is set up by hand once and never leaves the server.
