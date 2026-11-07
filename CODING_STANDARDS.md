# Coding standards

Judgement calls for review. Mechanical rules (no I/O in `core`, no literal UI strings, package boundaries) are enforced by lint and CI, not listed here.

- **Glossary names.** Domain concepts use the identifiers in `GLOSSARY.md`. A new domain concept without a glossary entry is a finding.
- **Behaviour lives in `core`.** Domain rules (resolution, default print, language fallback, allocation, layout geometry) belong in `core`, behind its public interface. Logic of that kind inside a React component or an API handler is a finding.
- **Every domain rule has a test at a seam.** A new or changed rule in `core` comes with a test on `core`'s public interface; a new or changed endpoint or import behaviour comes with an integration test at the `api` HTTP boundary. The two seams are the only ones.
- **Tests assert behaviour.** Tests go through public interfaces and assert observable results (resolved lines, allocations, PDF geometry in points, HTTP responses). Tests that reach into private helpers or assert call sequences are findings.
- **Same tool for everyone.** Supporter status may only hide ad banners or add cosmetic thanks (badge, theme). Code that gates a feature, limit, quota, export option or data access on supporter status, or that adds an ad that blocks a task (interstitial, ad before a download, anti-adblock wall), is a finding. See ADR 0005.
- **ADRs hold.** Changes that contradict an ADR in `docs/adr/` say so explicitly in the PR and propose reopening it.
- **Fixtures look like real data.** Test inputs have the shapes production sees: Scryfall "large" images are 672×936 px, not the card's exact 63:88 ratio. An expected value that contradicts a number in the spec or an ADR (a card that is not 63×88 mm) is a finding, even when the test is green.
