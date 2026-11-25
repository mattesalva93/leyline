# 0026: Saved work is migrated across versions, preferences fall back to their defaults

**Status:** accepted (2026-11-25)

## Decision

- **What a user built on their device is migrated, never dropped.** The decklist with its chosen prints and the sheet options each carry the version of their saved shape. When the shape changes, a migration brings each older version up to the current one, step by step.
- **Preferences fall back to their defaults** when their saved shape changes: panel sizes, tile width and the like. They need no migration.
- **Unreadable data never breaks the app.** What not even a migration can read is set aside, and the app starts as it would on an empty device.
- **Saved data is versioned on its own,** apart from the app version of ADR 0025: a release that leaves a saved shape alone keeps the data as it is. There is no "reset everything" switch.

## Why

- The alpha is open since 2026-11-24 and testers keep building decklists on their devices; losing one is the damage to avoid. Until now a saved shape of another version was left unread, which silently lost it.
- A lost panel size bothers nobody, so a migration for it would be work with no return.
- Tying saved data to the app version would wipe it at every release, since every merge to `main` is one.
