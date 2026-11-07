# mtg-suite

Free, unofficial web app for Magic: The Gathering players. Not affiliated with Wizards of the Coast. Card data and images come from [Scryfall](https://scryfall.com).

First module: a proxy sheet generator (see issue #1).

## Development

Requires [mise](https://mise.jdx.dev) and Docker.

```sh
mise install          # node and pnpm at the pinned versions
pnpm install          # also installs the git hooks
cp .env.example .env
pnpm db:up            # PostgreSQL with pg_trgm
pnpm check            # typecheck, lint, format check, tests (what CI runs)
```

Domain language lives in `GLOSSARY.md`, decisions in `docs/adr/`, review rules in `CODING_STANDARDS.md`. To debug with breakpoints, see [`docs/debugging.md`](docs/debugging.md).

## License

MIT
