# 0008: Accepted ADRs are immutable

**Status:** accepted (2026-11-09)

## Decision

Once accepted, an ADR's text never changes. A changed decision is a new ADR, and the old one's status line becomes `superseded by ADR NNNN`. The status line is the only part of an existing ADR that may be edited; ADRs are never deleted or renamed. `.husky/pre-commit` rejects any other staged change to an existing file in `docs/adr/`.

ADRs record why and the constraints; numbers and behaviour live in code and tests (see "Sources of truth" in `AGENTS.md`).

## Why

- Commit `155991f`, a `fix:`, rewrote ADR 0004 and the glossary entry for slot so they matched the new code. The decision changed without the owner choosing it, and the history no longer showed what the original decision was.
- Facts copied into several documents drift apart whenever one of them changes. Keeping each fact in one place means a bug fix touches only code.

## Considered options

- **Amend in place, with an "amended" note** (what happened in `155991f`): cheap, but the old decision disappears and nothing forces the change through the owner.
- **A review rule only** (the old "ADRs hold" standard): catches the change after the commit exists, if the review runs at all.
- **Supersede, enforced by a hook** (chosen): the mistake is mechanical, so a hook blocks it before the commit.

## Consequences

- Fixing a typo in an accepted ADR needs `git commit --no-verify`, done by the owner by hand; agents never pass it.
- ADRs that restated numbers stop doing so when they are superseded.
