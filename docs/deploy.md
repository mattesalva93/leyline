# Deploy

`.github/workflows/deploy.yml` deploys to any host with SSH and Docker Compose, and is off until the repository variable `DEPLOY_ENABLED` is `true` (ADR 0012).

## Turn it on

1. **Prepare the host.** Install Docker Engine, create a deploy user in the `docker` group, open ports 80 and 443, and point the domain's DNS at the host.
2. **Write the host's `.env`** in the deploy path, from `.env.example`, before the first deploy: PostgreSQL reads `POSTGRES_PASSWORD` only when it creates its volume, so a password changed later needs `ALTER USER` by hand. If the domain has an IPv6 (AAAA) record, `PUBLISH_ADDRESS=0.0.0.0` publishes on IPv4 only: drop the record, or Let's Encrypt may fail to reach the host.
3. **Make a key pair** for the workflow, and add its public half to the deploy user's `~/.ssh/authorized_keys`:

   ```sh
   ssh-keygen -t ed25519 -N '' -C mtg-suite-deploy -f deploy_key   # -N '': no passphrase, the runner cannot type one
   ```

4. **Pin the host key**, read from the host itself:

   ```sh
   ssh-keyscan -p <port> <host>   # prints the host's public keys in known_hosts format
   ```

   Check its fingerprint against the host's console (`ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub` there) before trusting it.

5. **Fill in GitHub**:

   ```sh
   gh secret set DEPLOY_SSH_KEY --env production < deploy_key
   gh secret set DEPLOY_KNOWN_HOSTS --env production    # paste the ssh-keyscan output
   gh variable set DEPLOY_HOST --body <host>
   gh variable set DEPLOY_USER --body <user>
   gh variable set DEPLOY_PATH --body <absolute path on the host>
   gh variable set DEPLOY_PORT --body <port>             # optional
   gh variable set DEPLOY_ENABLED --body true
   gh secret set TESTER_CREDENTIALS --env production < tester-credentials.caddy
   ```

   `gh secret set --env production` creates the secret in the `production` environment, so only jobs of that environment can read it. `tester-credentials.caddy` is the testers' list for production, made as `docs/staging.md` says, with its own credential for `pnpm check:staging`; see [Testers](#testers). Then delete the local `deploy_key` and `tester-credentials.caddy`.

6. **Deploy once by hand** to check it: `gh workflow run deploy.yml --ref main`, then `gh run watch` to follow it.

From then on, every push to `main` that passes CI is deployed. `gh variable set DEPLOY_ENABLED --body false` turns it off again.

## Testers

Every deploy writes the `TESTER_CREDENTIALS` secret to `docker/web/tester-credentials.caddy` on the host and reloads Caddy, so the host lets in exactly the testers the secret lists. Its format is the file's: one `<username> <hash>` line per tester (`docker/web/tester-credentials.example.caddy`), and `docs/staging.md` says how to make a credential. The deploy fails if the secret is empty.

GitHub never shows a secret again, so keep the whole list, usernames and hashes, where you keep the passwords. To add or revoke a tester, change the list, set the secret again with all of it, and deploy:

```sh
gh secret set TESTER_CREDENTIALS --env production < tester-credentials.caddy
gh workflow run deploy.yml --ref main
```

After a deploy, `pnpm check:staging --app https://<domain>` checks the host once `CHECK_STAGING_USERNAME` and `CHECK_STAGING_PASSWORD` in the shell hold production's check credential: they take precedence over `.env`'s. Set them with `read -s`, which hides what you type, rather than on a command line, which the shell history keeps.

## GitHub security settings once the repository is public

A public repository gets GitHub's secret scanning and push protection for free. They run beside CI's `gitleaks`: push protection rejects a push carrying a known secret before it reaches GitHub, where `gitleaks` can only fail the run afterwards.

```sh
# {owner}/{repo}: gh fills them in from the current checkout.
gh api --method PATCH repos/{owner}/{repo} --input - <<'JSON'
{"security_and_analysis": {
  "secret_scanning": {"status": "enabled"},
  "secret_scanning_push_protection": {"status": "enabled"}
}}
JSON
gh api --method PUT repos/{owner}/{repo}/vulnerability-alerts   # Dependabot alerts
gh api repos/{owner}/{repo} --jq .security_and_analysis         # check: both "enabled"
```

ADR 0006 lists the branch ruleset that also becomes available then.
