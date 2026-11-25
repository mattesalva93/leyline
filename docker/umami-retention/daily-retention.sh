#!/bin/sh
# Deletes Umami's data past its retention (retention.sql) once at start, then once a day, as
# Umami's own role: the catalog's roles cannot connect to its database (ADR 0027).
# `--single-transaction`: a failing statement deletes nothing; the next day tries again.
set -u

while :; do
  if psql -v ON_ERROR_STOP=1 --single-transaction --quiet -f /etc/umami-retention/retention.sql; then
    echo "Deleted Umami's data older than its retention."
  else
    echo "Umami's retention failed; the next run is in a day." >&2
  fi
  sleep 86400
done
