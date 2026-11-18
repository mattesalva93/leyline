#!/bin/sh
# The database's two roles besides the superuser (ADR 0016): `mtg_owner` owns the schema, migrates
# it and imports; `mtg_reader`, the API's, can only read. PostgreSQL runs this once, when it
# creates its volume. It is safe to run again, and brings an older volume, whose tables the
# superuser owns, to the same state (docs/staging.md).
set -eu

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set db="$POSTGRES_DB" \
  --set owner_password="$MTG_OWNER_PASSWORD" \
  --set reader_password="$MTG_READER_PASSWORD" <<'SQL'
-- `\gexec` runs each row the query returns as a statement: a role is created only when missing.
select 'create role mtg_owner login' where not exists (select from pg_roles where rolname = 'mtg_owner') \gexec
select 'create role mtg_reader login' where not exists (select from pg_roles where rolname = 'mtg_reader') \gexec
alter role mtg_owner password :'owner_password';
alter role mtg_reader password :'reader_password';

-- Shorter than the API's request timeout (packages/api/src/http/request-timeout.ts): a slow query
-- ends before the request it serves gives up.
alter role mtg_reader set statement_timeout = '5s';

-- The database's owner owns its `public` schema too, so `mtg_owner` can create tables there.
alter database :"db" owner to mtg_owner;
-- Nobody else connects or makes temporary tables, unless granted below.
revoke all on database :"db" from public;
grant connect on database :"db" to mtg_reader;
grant usage on schema public to mtg_reader;

select format('alter table public.%I owner to mtg_owner', tablename)
from pg_tables where schemaname = 'public' and tableowner <> 'mtg_owner' \gexec
grant select on all tables in schema public to mtg_reader;
-- Every table `mtg_owner` creates later, such as each import's, is readable too.
alter default privileges for role mtg_owner in schema public grant select on tables to mtg_reader;
SQL
