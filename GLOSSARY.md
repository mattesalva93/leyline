# Glossary

Language rule: code, identifiers, and code comments are in English. User-facing UI strings, issues, and specs are in Italian. When an issue says _carta_, the code says `Card`.

| Term (IT)                  | Identifier      | Meaning                                                                                                                                                            |
| -------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| carta                      | `Card`          | The abstract card, identified by Scryfall's `oracleId`. Answers "which card". Never a specific printing.                                                           |
| stampa                     | `Print`         | One specific printing of a `Card`: Scryfall id, set, collector number, language, printed name, release date, image status, faces. Answers "which version".         |
| nome stampato              | `printedName`   | The name printed on a `Print`, in its language.                                                                                                                    |
| faccia                     | `PrintFace`     | One printed face of a `Print`: its name and image URLs (small, normal, large). Single-faced prints have one face, double-faced prints two.                         |
| riga                       | `DecklistLine`  | One entry of a decklist: a `Card`, a quantity and a language, with the text it was written as.                                                                     |
| candidati                  | `candidates`    | The cards an `ambiguous` `DecklistLine` could mean, each with its `defaultPrint`: several cards match its name exactly, or are about as close to a misspelled one. |
| nome della faccia frontale | front-face name | The part of a multi-face card name before the `//` separator (`Delver of Secrets` in `Delver of Secrets // Insectile Aberration`).                                 |
| chiave del nome            | name key        | A name in the form lookups compare, where case, spacing and accents do not matter.                                                                                 |
| lingua                     | `Lang`          | The language a `DecklistLine` asks for, or a `Print` is printed in.                                                                                                |
| allocazione                | `Allocation`    | A pair (`Print`, quantity) inside a `DecklistLine`: how many of its copies use that print instead of the default one.                                              |
| stampa predefinita         | `defaultPrint`  | The `Print` a `DecklistLine` uses when the user picks none.                                                                                                        |
| stampabile                 | printable       | A `Print` that can stand in for a playable paper card.                                                                                                             |
| foglio                     | `Sheet`         | The `SheetOptions` plus the lines to print.                                                                                                                        |
| opzioni del foglio         | `SheetOptions`  | The layout options of a `Sheet`.                                                                                                                                   |
| copia                      | `Copy`          | One printed instance of a line's card: one `Slot` per face. A line with quantity 4 prints 4 copies.                                                                |
| slot                       | `Slot`          | One cell of the sheet grid, holding the image of one face of a `Copy`.                                                                                             |
| catalogo                   | `Catalog`       | The interface `core` uses to query cards and prints. `api` implements it on PostgreSQL; tests implement it in memory.                                              |
| voce di catalogo           | `CatalogEntry`  | A `Card` with every `Print` the `Catalog` holds for it: what the catalog returns for a name lookup.                                                                |
| stato immagine             | `imageStatus`   | Scryfall's `image_status`: `highres_scan`, `lowres`, `placeholder`, `missing`. Drives the language fallback.                                                       |
| avviso sulla stampa        | `PrintWarning`  | Why a line's `defaultPrint` needs the user's attention: its image is low-resolution, or the line's language had no print with a real image and English stands in.  |

_Avoid_: "card" for a printing (say `Print`), "variant" in code (a variant is a `Print` shown in the variant picker).
