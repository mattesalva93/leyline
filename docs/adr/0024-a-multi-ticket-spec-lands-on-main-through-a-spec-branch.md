# 0024: A multi-ticket spec lands on main through a spec branch, and GitHub enforces the protection

**Status:** accepted (2026-11-25); supersedes in part ADR 0006: enforcement

## Decision

- **A merge to `main` is still a release.** Every push to `main` that passes CI deploys, as today; there is no `stable` or `dev` branch.
- **A spec with more than one ticket gets a spec branch.** It is named `spec/<change>` (`spec/error-monitoring`) and cut from `main`. Each ticket still has its own `<type>/<change>` branch, cut from the spec branch, and reaches it through a pull request. When every ticket is in, one pull request `spec/<change> → main` releases the whole feature, and the spec branch is deleted.
- **Work that is not a multi-ticket spec goes straight to `main`**: a single ticket, a lone `fix/` or `chore/`, a dependency update.
- **A spec branch takes `main`'s changes by merge**, through a pull request `main → spec/<change>`, never by rebase.
- **GitHub enforces the protection on `main` and on `spec/**`** with one ruleset: changes arrive only through a pull request with no approvals required, CI's checks must pass, the branch must be up to date with its target, force push and deletion are blocked, and the bypass list is empty, the owner included. Linear history is not required: merge commits keep one topic per commit. The husky hooks of ADR 0006 stay as early feedback.

## Why

- A feature is released whole: its tickets converge on the spec branch, and testers never see half of it.
- A permanent `dev` branch would mix features, so one unfinished feature would hold back every other one.
- Feature flags would keep every ticket on `main`, but every feature would need flag code.
- The repository is now public, where GitHub offers rulesets on the free plan; the reason ADR 0006 gave for client-side-only enforcement is gone.
- With required checks, a red pull request cannot be merged, instead of being merged and then not deployed.
- With force push blocked, merging `main` into a spec branch is the only way to bring it up to date.

## Considered options

- **A permanent `dev` branch, merged into `main` to release** (git-flow): rejected, see above.
- **Feature flags on `main`**: rejected, see above.
- **One shared collector branch for a spec without its own protection** (`prepare-alpha-release`, spec #128): tried and dropped; a spec branch is the same idea, made explicit, named apart from ticket branches and protected like `main`.

## Consequences

- `CODING_STANDARDS.md`'s branch rule ("One branch per ticket, cut from `main`") changes: a ticket of a multi-ticket spec is cut from its spec branch.
- A long-lived spec branch drifts from `main`; the up-to-date rule makes the owner merge `main` into it before the release.
