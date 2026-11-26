#!/usr/bin/env bash
#
# Deploys `main` through the deploy workflow (ADR 0012) and follows the run, failing when it fails.
# The wizards in this folder run it; by hand: scripts/vps/deploy-main.sh

set -euo pipefail

latest_deploy() { gh run list --workflow deploy.yml --limit 1 --json databaseId --jq '.[0].databaseId // ""'; }

previous_run=$(latest_deploy)
gh workflow run deploy.yml --ref main
printf '  waiting for GitHub to start the run...\n'
until run=$(latest_deploy) && [[ -n "$run" && "$run" != "$previous_run" ]]; do sleep 2; done
# --exit-status: fail if the run fails.
gh run watch --exit-status "$run"
