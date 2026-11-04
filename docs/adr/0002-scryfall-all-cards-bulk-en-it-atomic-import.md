# 0002: Catalog from Scryfall `all_cards` bulk, filtered to en/it, imported atomically

**Status:** accepted (2026-11-04)

## Decision

A daily job streams Scryfall's `all_cards` bulk (~402 MB compressed on 2026-11-04), keeps only `lang` in (`en`, `it`), and swaps the new catalog in atomically (staging tables + one-transaction swap). At runtime the app queries only its own catalog; it never calls Scryfall's search API.

## Why

- Italian prints exist only in `all_cards`. `default_cards` is English-only.
- Scryfall's docs ask for bulk data over repeated API calls and set strict rate limits (2 req/s on search).
- Atomic swap means a failed import leaves yesterday's catalog serving.

## Consequences

- The import must stream; loading the file into memory would not fit a small VPS.
- Italian image quality is poor (only ~5,225 of 53,257 Italian prints are high-res on 2026-11-04), hence the `imageStatus` fallback rules in the glossary.
- Adding a language means widening the filter and the fuzzy-search name set.
