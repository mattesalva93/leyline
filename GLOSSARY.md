# Glossary

Language rule: code, identifiers, and code comments are in English. User-facing UI strings, issues, and specs are in Italian. When an issue says _carta_, the code says `Card`.

| Term (IT) | Identifier | Meaning |
|---|---|---|
| carta | `Card` | The abstract card, identified by Scryfall's `oracleId`. Answers "which card". Never a specific printing. |
| stampa | `Print` | One specific printing of a `Card`: Scryfall id, set, collector number, language, release date, image status, image URL per face. Answers "which version". |
| riga | `DecklistLine` | One entry of a decklist: original text, resolution status (`resolved` / `ambiguous` / `notFound`), `Card`, line language, quantity, and `Allocation`s. Language lives here, not on the allocation. |
| allocazione | `Allocation` | A pair (`Print`, quantity) inside a `DecklistLine`. Explicit allocations never exceed the line quantity; the remainder implicitly goes to the default print. |
| stampa predefinita | `defaultPrint` | The most recent paper `Print` in the line language, excluding digital-only, art series, oversized, tokens, playtest cards, and `placeholder`/missing images. |
| foglio | `Sheet` | Layout options (page format, margins, spacing, crop marks, image quality) plus the lines to print. |
| catalogo | `Catalog` | The interface `core` uses to query cards and prints. `api` implements it on PostgreSQL; tests implement it in memory. |
| stato immagine | `imageStatus` | Scryfall's `image_status`: `highres_scan`, `lowres`, `placeholder`, `missing`. Drives the language fallback. |

_Avoid_: "card" for a printing (say `Print`), "variant" in code (a variant is a `Print` shown in the variant picker).
