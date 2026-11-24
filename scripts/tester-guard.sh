#!/bin/sh
# Turns the testers' credential lines on stdin (format: docker/web/tester-credentials.example.caddy)
# into the Caddy guard that asks for them, on stdout. With no credential line it prints nothing,
# and the site stays open (ADR 0023): the deploy and local staging both write the guard with it.
#   sh scripts/tester-guard.sh < docker/web/tester-credentials.caddy > docker/web/tester-guard/basic-auth.caddy
set -eu
# Comments and blank lines are no credential. `|| true`: grep fails when it keeps no line.
credentials=$(grep -Ev '^[[:space:]]*(#|$)' || true)
[ -n "$credentials" ] || exit 0
printf 'basic_auth argon2id {\n%s\n}\n' "$credentials"
