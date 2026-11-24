#!/bin/sh
# The database's two roles besides the superuser (ADR 0016): `leyline_owner` owns the schema,
# migrates it and imports; `leyline_reader`, the API's, can only read. PostgreSQL runs this once,
# when it creates its volume. It is safe to run again, and brings an older volume, whose tables the
# superuser owns, to the same state (docs/staging.md).
set -eu

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set db="$POSTGRES_DB" \
  --set owner_password="$LEYLINE_OWNER_PASSWORD" \
  --set reader_password="$LEYLINE_READER_PASSWORD" <<'SQL'
-- `\gexec` runs each row the query returns as a statement: a role is created only when missing.
select 'create role leyline_owner login' where not exists (select from pg_roles where rolname = 'leyline_owner') \gexec
select 'create role leyline_reader login' where not exists (select from pg_roles where rolname = 'leyline_reader') \gexec
alter role leyline_owner password :'owner_password';
alter role leyline_reader password :'reader_password';

-- Shorter than the API's request timeout (packages/api/src/http/request-timeout.ts): a slow query
-- ends before the request it serves gives up.
alter role leyline_reader set statement_timeout = '5s';

-- The database's owner owns its `public` schema too, so `leyline_owner` can create tables there.
alter database :"db" owner to leyline_owner;
-- Nobody else connects or makes temporary tables, unless granted below.
revoke all on database :"db" from public;
grant connect on database :"db" to leyline_reader;
grant usage on schema public to leyline_reader;

select format('alter table public.%I owner to leyline_owner', tablename)
from pg_tables where schemaname = 'public' and tableowner <> 'leyline_owner' \gexec
grant select on all tables in schema public to leyline_reader;
-- Every table `leyline_owner` creates later, such as each import's, is readable too.
alter default privileges for role leyline_owner in schema public grant select on tables to leyline_reader;
SQL
