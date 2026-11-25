# 0006: main is protected by local git hooks

**Status:** accepted (2026-11-07), superseded in part by ADR 0024 (2026-11-25): enforcement

## Decision

Nobody pushes to `main`, the owner included, with no bypass. `main` only moves by merging a pull request on GitHub, then `git pull --ff-only` locally. The rule is enforced client-side with husky hooks:

- `.husky/pre-push` rejects any push whose remote ref is `refs/heads/main`, which covers plain pushes, force pushes and deletion.
- `.husky/pre-commit` rejects commits while `main` is checked out.

Feature branches stay unrestricted, force push included, so rebasing and `git push --force-with-lease` keep working. Pull requests require no approvals: GitHub forbids approving your own pull request, and only collaborators with write access (today, only the owner) can merge.

## Why

- The repository is private on GitHub Free, where rulesets and branch protection are unavailable (the API answers 403).
- The project has a single collaborator working from one machine, so server-side enforcement is not needed yet.

## Consequences

- The hooks are not a hard guarantee: `--no-verify` skips them, and they only run where husky is installed (`pnpm install`).
- No extra escape hatch (such as an environment variable) is added.
- When the repository moves to GitHub Pro or becomes public, add a server-side ruleset `protect-main` on the default branch (require a pull request with 0 approvals, block force pushes and deletion, empty bypass list) and keep the hooks as early feedback.
