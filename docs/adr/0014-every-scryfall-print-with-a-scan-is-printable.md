# 0014: Every Scryfall print with a scan is printable

**Status:** accepted (2026-11-17)

## Decision

- A print is printable when Scryfall has a scan of it. Digital-only, oversized, art series, token, emblem and playtest prints are all printable and can all be picked. Prints whose image is `placeholder` or `missing` never are.
- The categories excluded until now become an order of preference for the default print. Among a card's printable prints in a language, a regular paper print wins over a playtest one, then oversized, then art series, then token or emblem, then digital-only. Within a category the newest print wins, as before.
- The same order ranks cards that share a name, by their default prints: a card comes before the art series card Scryfall names after it, and a line naming both resolves to the card.
- Oversized prints are scaled into the slot like any other (ADR 0013). Art series print only their front, the art: a proxy goes in a sleeve in front of a real card, their back only tells set, number and artist, and for about one in three Scryfall serves a stand-in picture there, marked as a real scan.
- Planes and phenomena (layout `planar`) are played sideways, but Scryfall serves their images upright, the plane's top edge on the left. They print like any other card, never turned.

The rule replaces story 21 of the MVP spec (#1), which kept these prints out of the default print, and the code that kept them out of the print picker as well. No ADR recorded it.

The order is pinned by the default-print tests in `packages/core`, starting with "prefers a paper print over playtest, oversized, art series, token and digital ones" in `packages/core/src/decklist.test.ts`. "prints a plane as Scryfall serves it, upright like any card" in `packages/core/src/sheet-pdf.test.ts` pins that planes are never turned.

## Why

- Tokens and emblems are needed on the table, and adding a deck's tokens automatically depends on printing them.
- A card whose only prints were playtest ones, such as Boltfire from Mystery Booster 2, could not be printed by name, yet the same print went through when the line named its set and number. One rule now applies on both paths.
- Playtest and oversized cards are real paper cards. A digital-only card is not, but someone printing it can only want it as it is on Scryfall.
- A plane looks landscape on the table, so turning its image is the obvious fix to reach for. It would turn an image already upright and clip its copyright line away, which ADR 0013 forbids.

## Considered options

- **Keep the filter and label the excluded cards in search**: honest, but leaves tokens and playtest cards unprintable.
- **Everything with a scan is printable, with a preference order** (chosen).
