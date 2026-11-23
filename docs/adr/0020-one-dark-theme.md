# 0020: One dark theme, no theme switch

**Status:** accepted (2026-11-23)

## Decision

The app has one theme: today's dark one. It ignores `prefers-color-scheme` and offers no switch between a light and a dark theme. Every design token still lives in the Tailwind theme alone (ADR 0010), so a component never names a colour of its own.

## Why

- One palette to keep accessible: card scans, sibling colours, warnings and focus rings are checked against one background, not two.
- A light/dark switch is the feature every generic app ships by default. It adds a second palette and a control to maintain, for a choice the project does not need to offer.
- The decision is not expected to be revisited.

## Considered options

- **Light and dark, following the system, with a manual switch**: the setup before this decision. Every design change is made and checked twice.
- **One light theme**: card-collection tools that show scans on a dark charcoal background let the art stand out against it (`research/restyle-ispirazioni.md`).
- **One dark theme** (chosen).

## Consequences

- The tokens keep a single home, so a cosmetic theme as thanks for supporters (ADR 0005) can still be added without touching the components.
- The printed sheet and its PDF are not themed: paper stays white whatever the app looks like.
