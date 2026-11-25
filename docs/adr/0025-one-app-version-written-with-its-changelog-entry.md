# 0025: One app version, written with its changelog entry in the pull request to main

**Status:** accepted (2026-11-25)

## Decision

- **One version for the whole product**: web, API and core share it, in SemVer `0.x.y` through the alpha and the beta. A release with a `feat` raises the minor, one with only `fix` or `chore` raises the patch, and the public release is `1.0.0`. Numbering starts at `0.1.0` for the alpha already online.
- **Every pull request to `main` adds a changelog entry** to `CHANGELOG.md` at the repository root: the new version, the date, and what changed for testers, in Italian, grouped as "Novità" and "Correzioni". The same pull request writes the version into `package.json`. CI fails a pull request to `main` whose entry is missing, whose version is not above `main`'s, or whose version differs from `package.json`'s. Pull requests to a `spec/` branch (ADR 0024) need no entry: the spec's pull request to `main` writes it.
- **A successful deploy tags the release** `vX.Y.Z` and publishes a GitHub Release with notes generated from the commits, in English, for developers.
- **A page left open on an older release invites its user to reload.** The app knows the version it was built with and, when it comes back to the foreground, asks the server for the current one, which is never cached. It never reloads on its own.

## Why

- Web and API always deploy together, so a version per package would only drift apart.
- With the ruleset of ADR 0024 nothing can commit to `main` after a merge, so a changelog written "at every merge" has to be in the pull request itself, and CI is what makes it always present.
- Testers read what changed in their language; developers get commit-level notes for free from Conventional Commits.
- Error monitoring and rollbacks need a fixed name for each release, and a tag is that name.
- Reloading on its own would interrupt a user in the middle of choosing prints.

## Considered options

- **Versions computed by a bot after the merge** (semantic-release, release-please): rejected, the bot needs to commit to `main` or adds a release pull request, so a merge would no longer be the release.
- **The changelog only in GitHub Releases**: rejected, it would be English and commit-shaped, not written for testers, and the app could not show it without calling GitHub.
