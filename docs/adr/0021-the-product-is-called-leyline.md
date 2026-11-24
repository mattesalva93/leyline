# 0021: The product is called Leyline

**Status:** accepted (2026-11-24)

## Decision

The product is called **Leyline**. `mtg-suite` was a working name and leaves every place the project controls: the interface, the PDF it hands out, the monorepo's packages, the keys the device keeps, the database and its roles, the Docker and Compose names, the deploy scripts and the docs. Identifiers spell it in lowercase, `leyline`, with the separator their format asks for.

Older ADRs keep their words: where ADR 0005 says "mtg-suite" and ADR 0016 names `mtg_owner` and `mtg_reader`, read Leyline and the `leyline_` roles. `app-shell.test.tsx` pins the name the top bar shows.

## Why

- `mtg-suite` described the technology, not the product, and carried "MTG", the abbreviation of Magic: The Gathering, a Wizards of the Coast game.
- In the game a leyline is a card put on the battlefield before the match begins, as proxies are prepared before playing.
- Before the alpha no user has data saved on a device and no database holds anything that cannot be imported again, so every name changes at once, with no migration.

## Considered options

- **Keep `mtg-suite`**: the trademark of someone else in the product's name.
- **Rename only what users see, keep internal names**: two names to keep apart in the code for no gain before the alpha.
- **Leyline, everywhere the project controls** (chosen).

## Consequences

- A development or staging volume created before this decision holds the old database and roles, which no script renames: the stack starts on a new volume and the catalog is imported again.
- Names the project does not control yet, the security contact mailbox and the alpha's domain, change when the owner renames them.
- Leyline is also a cycle of Wizards cards: the name is checked against trademarks and the Fan Content Policy before the public release.
