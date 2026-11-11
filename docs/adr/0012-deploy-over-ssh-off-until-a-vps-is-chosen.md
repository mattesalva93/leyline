# 0012: Deploy over SSH, off until a VPS is chosen

**Status:** accepted (2026-11-11)

## Decision

A GitHub-hosted runner deploys `main` after CI passes on it (`.github/workflows/deploy.yml`). It copies the tracked files to the host over SSH and runs the same `docker compose up` staging runs, so the host builds its own images (ADR 0011). The workflow names no provider: where to deploy lives in repository variables and secrets.

The workflow stays off until a repository variable turns it on. No self-hosted runner is used.

## Why

- Issue #1 asks for a deploy workflow ready but off until the VPS is chosen, independent of the provider, with no self-hosted runner.
- A variable turns it on and off without a code change.
- Copying the sources keeps the private repository's credentials off the host, and building on the host needs no image registry.
- **Alternatives rejected:**
  - Building images in Actions and pushing them to a registry: faster deploys, but a registry login on the host and a second compose shape for production.
  - `git pull` on the host: a deploy key for the repository on the server.

## Consequences

- The host builds on every deploy, so it needs the RAM and disk of a `pnpm install` and a Vite build.
- Files deleted from the repository stay on the host until removed by hand; `tar` only adds and overwrites.
- The host's `.env` is set up by hand once and never leaves the server.
