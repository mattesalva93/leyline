# 0013: An optional solid-colour bleed around the untouched image

**Status:** accepted (2026-11-17); supersedes ADR 0007

## Decision

- Card images are placed in the PDF as Scryfall serves them, scaled uniformly to cover the slot and centred. No stretching, no colour changes, no watermarks, never any pixel of the image extended or mirrored. Clipping only ever removes outer border, never the copyright line or the artist credit.
- The image is always clipped to the outline a real card is cut and sleeved along: the slot with rounded corners, as ADR 0007 decided. With no bleed (the default), paper shows outside that outline.
- With bleed on, an advanced option for the enthusiast, each card sits on a rectangle of solid colour that reaches the chosen width beyond the slot on every side and fills the slot's corners behind the clipped image. The band takes the print's border colour as Scryfall records it. A borderless print has no border colour, so each side of its band takes the colour read from that side's outer edge of the image, still one solid colour per side.
- The bleed widens every card's place on the sheet; the margin stays the least paper around everything printed, bleed included, so the grid follows from it as before (ADR 0009). Crop marks mark the card's edge, not the band's, and never print over the band.

The geometry will be pinned by the "bleed" tests in `packages/core/src/sheet-pdf.test.ts`, next to the ADR 0007 tests it keeps: "fills the slot with a Scryfall "large" image, scaled uniformly, trimming only the side edges" and "cuts every card to the shape of a real card".

## Why

- A cutter or a cutting machine strays by half a millimetre to a millimetre. Without bleed, a stray cut leaves a white sliver on the card's edge; the enthusiast this option is for wants a perfect proxy.
- Scryfall's image rules forbid covering or cropping the copyright and artist, distorting, recolouring and adding watermarks or logos (`research/proxy.md`). A solid band around an unaltered image does none of these; mirrored or stretched edges would add content made from the image, so they stay out.
- A band in the border colour is invisible once cut on the many bordered cards. Borderless prints need the colour of their own art's edge, or a cut that strays shows a hard step.
- Scryfall's JPGs paint the corners outside the card's curve white or black depending on the print (ADR 0007). Dropping the clip under a bleed would print those corners; keeping it and filling them with the band gives every card the same corners in the band's colour.

## Considered options

- **No bleed** (ADR 0007): no question about Scryfall's rules, but every stray cut shows.
- **Mirrored or stretched edges**, as Proxxied and others do: seamless, but made from the image's pixels.
- **Solid black for every card**: simple, but visible on white-bordered and borderless cards.
- **Solid band in the border colour, read from the edge for borderless prints** (chosen).

## Consequences

- The catalog has to import each print's border colour from Scryfall.
- On A4 with a common margin, a wide bleed drops the page from three columns to two; the preview shows it.
- Custom uploaded images, if ever added, are the user's responsibility and follow a separate decision.
