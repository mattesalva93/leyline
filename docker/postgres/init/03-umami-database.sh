#!/bin/sh
# Umami's own database and role (ADR 0027), apart from the catalog: `umami` owns the `umami`
# database and nothing else, and connects to no other database. PostgreSQL runs this once, when it
# creates its volume; on a volume that already exists, such as production's, the deploy runs it
# as the superuser before Umami starts (.github/workflows/deploy.yml). Run again, it creates
# nothing and leaves the role's password as the host's `.env` gives it.
set -eu

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set umami_password="$UMAMI_DATABASE_PASSWORD" <<'SQL'
-- `\gexec` runs each row the query returns as a statement: CREATE DATABASE cannot run inside the
-- transaction a DO block would need, so each object is created only when missing this way.
select 'create role umami login' where not exists (select from pg_roles where rolname = 'umami') \gexec
alter role umami password :'umami_password';
select 'create database umami owner umami' where not exists (select from pg_database where datname = 'umami') \gexec

-- Only `umami` connects to its database: not the catalog's roles, nor any role added later.
revoke all on database umami from public;
SQL
