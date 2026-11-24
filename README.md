# Leyline

Free, unofficial web app for Magic: The Gathering players. Not affiliated with Wizards of the Coast. Card data and images come from [Scryfall](https://scryfall.com).

## Status

Closed alpha: a first module, the proxy sheet generator, shared with a few testers before a public release. The app is reachable only with the credentials each tester is given. To report a vulnerability, see [`SECURITY.md`](SECURITY.md).

## What it does

Paste a decklist, pick the prints, print the sheet.

- Recognises card names written in English or Italian, even misspelled, line by line, and flags the lines to fix.
- Lets you pick the print and the language of every line, and split its copies across several prints.
- Lays the cards out on an A4 or Letter sheet with crop marks, with a preview of every page.
- Builds the PDF in your browser.

The words this README uses for the app's parts (line, print, tile, sheet) are defined in [`GLOSSARY.md`](GLOSSARY.md).

## Tech stack

- **Web:** React, Vite, Tailwind with owned components on Radix, i18next (Italian UI).
- **API:** Hono on Node.
- **Data:** PostgreSQL with `pg_trgm`, filled from Scryfall's bulk data.
- **Serving:** Caddy over HTTPS, in Docker Compose.
- **Tooling:** pnpm workspaces, TypeScript, Vitest, ESLint, Prettier, knip, Playwright for the preview scripts.

## Getting started

Requires [mise](https://mise.jdx.dev) and Docker.

### Run it

```sh
mise install          # node and pnpm at the pinned versions
pnpm install          # also installs the git hooks
cp .env.example .env
pnpm db:up            # PostgreSQL with pg_trgm, a database of its own apart from staging's
pnpm import:catalog   # download Scryfall's all_cards bulk (~400 MB) and fill the catalog
pnpm dev              # api on 127.0.0.1:3000, web on http://127.0.0.1:5173
```

`pnpm import:catalog --file all-cards.jsonl.gz` imports a bulk file downloaded earlier. `pnpm import:daily` keeps running and imports again once a day.

### Checks and previews

```sh
pnpm check                # typecheck, lint, format, theme, unused code, tests (what CI runs; needs db:up)
pnpm build                # production build of web and api
pnpm sheet:preview        # render a sample sheet to .preview/sheet-*.png (needs pdftoppm: brew install poppler)
pnpm web:preview          # screenshot the running app at phone and desktop widths into .preview/web-*.png
pnpm check:phone-width    # check in the running app that the phone workspace never outgrows the screen
pnpm check:staging        # check on the running staging stack what lives in its configuration, such as the security headers
```

Each of these scripts explains its options in its first lines.

To run the whole production stack locally as staging (Caddy on https://localhost, api, PostgreSQL, and the `importer` service that fills the catalog on first start and refreshes it daily), see [`docs/staging.md`](docs/staging.md). Deploying to a VPS is prepared but off: see [`docs/deploy.md`](docs/deploy.md).

## Repository layout

- `packages/core`: the domain rules (decklist resolution, prints, allocation, sheet layout and PDF), with no I/O. Its public interface is `src/index.ts`.
- `packages/api`: the HTTP API over the catalog, and the Scryfall importer.
- `packages/web`: the browser app.

Inside each package, code is grouped in folders by feature: see "Folders by feature" in [`CODING_STANDARDS.md`](CODING_STANDARDS.md).

## Documentation

- [`GLOSSARY.md`](GLOSSARY.md): what each domain word means.
- [`docs/adr/`](docs/adr/): the decisions and why they were taken.
- [`CODING_STANDARDS.md`](CODING_STANDARDS.md): the rules a review checks.
- [`docs/staging.md`](docs/staging.md), [`docs/deploy.md`](docs/deploy.md), [`docs/debugging.md`](docs/debugging.md): running, deploying and debugging.
- [`research/`](research/): dated background research the decisions cite.
- [`AGENTS.md`](AGENTS.md): how coding agents work in this repo.

## License

[MIT](LICENSE)
