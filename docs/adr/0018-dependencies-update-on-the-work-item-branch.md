# 0018: Dependencies update on the work item's branch, not in Dependabot's PRs

**Status:** accepted (2026-11-18)

## Decision

- Dependabot opens no version-update PRs: `.github/dependabot.yml` is gone. Its vulnerability alerts stay on, since they open no PR.
- Every work item's branch takes the pending dependency updates in before its PR is opened, in `chore(deps):` commits. `pnpm deps:outdated` lists them; `docs/agents/dependency-updates.md` holds the steps.
- Majors come in the same way, with whatever fixes they need: no update is left for later.

## Why

- Dependabot's first run, on 2026-11-18, opened four PRs against `main` (#147–#150). Each merge rewrote `pnpm-lock.yaml` and put the next PR in conflict, so every merge needed another rebase round and another CI run. One of them (knip 6) failed CI and needed a PR of its own to replace it.
- Dependabot cannot target the branch being worked on: `target-branch` names one fixed branch.
- Updates on the work item's branch pass through the same review and the same CI as the work, one PR at a time.

## Considered options

- **Dependabot with every update grouped into one monthly PR**: fewer conflicts, but still a PR against `main` outside any work item.
- **Removing Dependabot with nothing in its place**: dependencies would drift until something broke.
- **Updates on the work item's branch** (chosen).

## Consequences

- ADR 0017 relied on Dependabot to update `.github/workflows/actions.lock`; `gh actions-lock`, run by hand after a new tag in `uses:`, takes its place.
- Updates arrive only as often as PRs do: a quiet week brings none. CI's `pnpm audit` and `trivy` still fail on a known vulnerability with a fix.
- A work item's PR also carries an unrelated `chore(deps):` commit.
