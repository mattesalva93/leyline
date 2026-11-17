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
pnpm check            # typecheck, lint, format check, theme check, tests (what CI runs; needs db:up)
pnpm build            # production build of web and api
pnpm sheet:preview    # render a sample sheet to .preview/sheet-*.png (needs pdftoppm: brew install poppler)
pnpm landing:screenshots  # retake the landing page's tutorial screenshots from the running app (see scripts/landing-screenshots.js)
pnpm check:phone-width   # check in the running app that the phone workspace is never wider than the screen (see scripts/check-phone-width.js)
pnpm web:preview       # screenshot the running app at phone and desktop widths into .preview/web-*.png (see scripts/web-preview.js)
```

`pnpm import:catalog --file all-cards.jsonl.gz` imports a bulk file downloaded earlier.

`pnpm import:daily` keeps running and imports again once a day.

To run the whole production stack locally as staging (Caddy on https://localhost, api, PostgreSQL, and the `importer` service that fills the catalog on first start and refreshes it daily), see [`docs/staging.md`](docs/staging.md). Deploying to a VPS is prepared but off: see [`docs/deploy.md`](docs/deploy.md).

Domain language lives in `GLOSSARY.md`, decisions in `docs/adr/`, review rules in `CODING_STANDARDS.md`. To debug with breakpoints, see [`docs/debugging.md`](docs/debugging.md).

## License

MIT
