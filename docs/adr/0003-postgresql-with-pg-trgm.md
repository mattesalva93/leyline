# 0003: PostgreSQL with `pg_trgm`

**Status:** accepted (2026-11-04)

## Decision

The catalog lives in PostgreSQL. Fuzzy name search (English names and every Italian printed name) uses the `pg_trgm` extension.

## Why

- Fuzzy, misspelled, bilingual name lookup is a core MVP behaviour; `pg_trgm` gives it without an extra search service.
- Later phases (deck analysis, agents) can add `pgvector` on the same database, avoiding a migration.
- SQLite was considered and rejected for weaker fuzzy search.

## Consequences

- Integration tests run against a real PostgreSQL in Docker, not an in-memory substitute.
- `core` never talks to PostgreSQL directly: it goes through the `Catalog` interface.
