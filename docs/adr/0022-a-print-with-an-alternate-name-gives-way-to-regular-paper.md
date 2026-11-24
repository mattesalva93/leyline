# 0022: A print with an alternate name gives way to a regular paper print

**Status:** accepted (2026-11-24); supersedes ADR 0014

## Decision

- A print is printable when Scryfall has a scan of it. Digital-only, oversized, art series, token, emblem and playtest prints are all printable and can all be picked. Prints whose image is `placeholder` or `missing` never are.
- Among a card's printable prints in a language, the default print follows an order of preference: a regular paper print wins over one with an alternate name (`flavorName`, see `GLOSSARY.md`), then playtest, then oversized, then art series, then token or emblem, then digital-only. Within a category the newest print wins.
- A line written with an alternate name resolves to the card, and its default print is chosen among the prints carrying that alternate name, by the same order.
- The same order ranks cards that share a name, by their default prints: a card comes before the art series card Scryfall names after it, and a line naming both resolves to the card.
- Oversized prints are scaled into the slot like any other (ADR 0013). Art series print only their front, the art: a proxy goes in a sleeve in front of a real card, their back only tells set, number and artist, and for about one in three Scryfall serves a stand-in picture there, marked as a real scan.
- Planes and phenomena (layout `planar`) are played sideways, but Scryfall serves their images upright, the plane's top edge on the left. They print like any other card, never turned.

This ADR keeps every decision of ADR 0014 and adds the alternate name to the order, right after regular paper prints (issue #194).

The order is pinned by the default-print tests in `packages/core`, starting with "prefers a paper print over playtest, oversized, art series, token and digital ones" in `packages/core/src/decklist/decklist.test.ts`; the place of the alternate name is pinned there by "prefers a regular paper print over one with an alternate name". "prints a plane as Scryfall serves it, upright like any card" in `packages/core/src/sheet/sheet-pdf.test.ts` pins that planes are never turned.

## Why

- A print with an alternate name shows a name other than the card's: someone who writes "Walking Ballista" and gets a proxy titled "Assaultron Invader" did not ask for it. Someone who wants that version writes its alternate name, or its set and number.
- It is still a real paper card, so it comes before the kinds ADR 0014 already ranked below regular paper.
- Tokens and emblems are needed on the table, and adding a deck's tokens automatically depends on printing them.
- A card whose only prints were playtest ones, such as Boltfire from Mystery Booster 2, could not be printed by name, yet the same print went through when the line named its set and number. One rule applies on both paths.
- Playtest and oversized cards are real paper cards. A digital-only card is not, but someone printing it can only want it as it is on Scryfall.
- A plane looks landscape on the table, so turning its image is the obvious fix to reach for. It would turn an image already upright and clip its copyright line away, which ADR 0013 forbids.

## Considered options

- **Keep ADR 0014's order**: a print with an alternate name stays a regular paper print and becomes the default whenever it is the newest one.
- **An alternate name right after regular paper** (chosen).
