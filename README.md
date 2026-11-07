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
pnpm import:catalog   # download Scryfall's all_cards bulk (~400 MB) and fill the catalog
pnpm dev              # api on 127.0.0.1:3000, web on http://127.0.0.1:5173
pnpm check            # typecheck, lint, format check, tests (what CI runs; needs db:up)
pnpm build            # production build of web and api
```

`pnpm import:catalog --file all-cards.jsonl.gz` imports a bulk file downloaded earlier.

To run the whole stack in containers (web on http://127.0.0.1:8080, api, PostgreSQL):

```sh
docker compose up --build
docker compose run --rm api node dist/import.js   # fill the catalog, first time
```

Domain language lives in `GLOSSARY.md`, decisions in `docs/adr/`, review rules in `CODING_STANDARDS.md`. To debug with breakpoints, see [`docs/debugging.md`](docs/debugging.md).

## License

MIT
