# 0029: A spec branch can be deleted after its release, main cannot

**Status:** accepted (2026-11-25); supersedes in part ADR 0024: deletion of spec branches, and two rulesets in place of one

## Decision

- **Deletion is blocked on `main` only.** A `spec/<change>` branch keeps every other protection of ADR 0024, but it can be deleted, so that it is deleted once its pull request to `main` is merged, as ADR 0024 asks.
- **Two rulesets carry the protection**: `protect-main` holds the rules `main` and `spec/**` share, and `block-main-deletion` holds the one rule only `main` has. A ruleset's rules apply to every branch it targets, so one ruleset cannot block deletion on one of its branches and allow it on another.

## Why

- ADR 0024 both blocks deletion on `spec/**` and deletes the spec branch after the release; with an empty bypass list, nobody could do the second.
- A released spec branch left on GitHub would only gather stale branches; the merge commit on `main` already keeps its history.
- Deletion is the only rule that tells the two kinds of branch apart, so it is the only one kept in a ruleset of its own.

## Considered options

- **Keep the spec branches after their release**: rejected, see above.
- **Disable the ruleset for a moment to delete a spec branch**: rejected; an empty bypass list that the owner switches off by hand is a bypass.
- **Two complete rulesets, one per kind of branch**: rejected; the list of required checks would live in two places and drift.
