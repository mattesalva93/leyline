# 0028: Leyline is a modular monolith: new areas are routes of one app, a separate service only for a different runtime

**Status:** accepted (2026-11-25)

## Decision

- **One repository, one app, one API, one deploy.** The areas planned after the proxy sheet generator (deckbuilder, collection manager, an assistant for deck building, a wiki of keywords and banlists) are new areas of the same web app, routes of its shell, and new routes of the same API. Each area is loaded on its own, so one area's code does not weigh on another's first load.
- **A separate service only for a different runtime**: a process with its own life cycle, network reach, resources or cost, as the importer already is next to the API. It is a new service of the same Compose file, built from the same repository and released with the same version (ADR 0025).
- **Domain rules shared across areas live in `core`**, free of I/O, as today; an area's own rules start in its own folder and move to `core` when a second area needs them.
- **A piece of interface becomes shared when a second area uses it**, not before: the ticket that brings the second user first moves it out of the first area's folder behind an interface both can use.

## Why

- The planned areas share almost everything: the catalogue, prints, card search, languages, the shell. In one repository a change to what a card or a print is lands in one pull request, one check and one release.
- One developer releases everything together, and web and API already deploy as one (ADR 0025): services released apart would add network contracts, compatible versions and coordinated deploys with nothing to gain.
- Every service repeats the security baseline (ADR 0016) and takes its share of the VPS's memory.
- A shared component designed before its second user guesses what that user needs; the second user tells.

## Considered options

- **Microservices, one per area or per capability**: rejected, see above.
- **One repository per area, sharing published packages**: rejected; a change to the shared model would need a release of the package and an update in every repository.
- **Generalising search, print choice and card images now** for areas to come: rejected, see the last reason.

## Consequences

- The first ticket of a new area that reuses a generator part (card search, print choice, card image, today in the generator's workspace) starts by moving it into a shared folder.
- Accounts, an outbound call to an AI provider, and content not from Scryfall are each a decision of their own, taken when the area that needs them starts.
