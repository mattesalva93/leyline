# 0009: The margin is a minimum, and crop marks yield to it

**Status:** accepted (2026-11-11)

## Decision

- The sheet's margin is the least white paper between the page edge and anything printed, one value for all four sides. The sheet holds as many columns and rows of cards as fit inside it, with the chosen spacing between cards, and the grid is always centred on the page.
- Crop marks sit on the extensions of the card edges, never on a card. Around the grid they use the room between the grid and the margin, and never move the grid or change how many cards a page holds: when that room is short a mark is shortened, and when there is none it is left out. When the cards are spaced apart, marks also cross every gap between them, from one card's box to the next.
- The page preview is drawn from the same layout the PDF is drawn from, so the two cannot drift apart.

The geometry is pinned by the tests in `packages/core/src/sheet-pdf.test.ts`: the "margins and spacing" and "crop marks" groups, "still fits two cards by two at the widest margin and spacing it accepts" and "places every slot and crop mark where the PDF draws them".

## Why

- Home printers cannot print up to the paper edge, and how close they get differs between models. A minimum margin says exactly that, and lets the cards per page follow from it instead of from a second setting.
- A centred grid prints the same whatever the printer's offset, and leaves equal room on opposite sides for the crop marks.
- With spacing, a cutter cuts each card on its own, along lines that run between the cards; marks inside the gaps show those lines where the outer marks are far away. They can reach the cards' boxes because real cards have rounded corners, so the box corner is blank paper.
- Cards per page matter more than mark length: reserving room for full-length marks would drop a whole column of cards (a third of the sheet) as soon as the spacing grows past a millimetre on A4.

## Considered options

- **Separate margins per side**: more settings for a need nobody has stated; the grid could no longer be centred whenever the sides differ.
- **Crop marks reserve their room** inside the margin: every mark full-length, but fewer cards per page with any spacing.
- **Crop marks shorten** (chosen).

## Consequences

- With a wide margin and a 3×3 grid that barely fits, the side marks can disappear; the marks above and below the grid usually remain.
- Margin and spacing are bounded so that an A4 page always holds at least two cards by two.
