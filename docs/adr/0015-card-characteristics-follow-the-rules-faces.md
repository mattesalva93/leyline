# 0015: Power, toughness and keywords follow the faces of the card in the rules

**Status:** accepted (2026-11-18)

## Decision

A `Card` holds its power and toughness once per face of the card in the rules, as Scryfall's `card_faces` lists them, and never once per image of a print. A face without them (the spell of an adventure, both halves of a split card) holds none. The keywords belong to the whole card. A reversible card prints the same card twice, so it has one face.

The two lists are therefore not paired by index: an adventure, split or flip card has two faces and one image, a reversible card one face and two images. Code that shows power and toughness next to an image must match them by name or by layout, never by position.

The tests under "the power, toughness and keywords of a card" in `packages/api/src/app.test.ts` pin the rule, starting with "gives the faces of a card in the rules, not the images of its print: an adventure, a split and a flip card have two".

## Why

- Power, toughness and keywords are data of the card, the same on every print, while images belong to a print.
- Faces in the rules lose nothing: the back half of a flip card (Kenzo the Hardhearted, 3/4) and the half of an adventure that is the creature both stay known. One entry per image would drop them or merge them.
- The per-image view can be derived from the faces in the rules, but the faces cannot be rebuilt from the images.

## Considered options

- **One entry per image of the print** (`PrintFace`): lines up with the images, but the faces of a single-image card are lost, and the card's data would change from one print to the next.
- **One entry per face of the card in the rules** (chosen).
