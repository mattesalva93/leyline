# 0010: Tailwind with owned components on Radix primitives

**Status:** accepted (2026-11-11)

## Decision

The web app is styled with Tailwind CSS. Its interface components follow the shadcn/ui model: their source is copied into the repository and owned there, built on Radix primitives for behaviour and accessibility.

## Why

- The app grows from one page to several areas (generator, deck analysis, assistant, news). One hand-written stylesheet does not scale to that, and each area would otherwise restyle the same controls.
- Dialogs, menus, side panels and bottom panels need focus handling, keyboard support and screen-reader semantics. Radix gives those; writing them by hand is slow and easy to get wrong.
- Owned component source keeps the look fully ours: there is no library theme to fight, and no upgrade can change the design.
- **Alternatives rejected:**
  - Plain CSS with CSS Modules and tokens: no dependencies, but every accessible component is written by hand.
  - A packaged component library (MUI, Mantine): fast to start, but its look is hard to leave behind, and the cards must stay the visual lead.

## Consequences

- Styling lives in the markup as utility classes; the design tokens (colours, type, spacing) live in the Tailwind theme, which is their one home.
- The PDF is untouched: it is drawn in `core` (ADR 0001) and shares no styling with the page.
