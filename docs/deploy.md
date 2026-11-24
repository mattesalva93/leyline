# Deploy

`.github/workflows/deploy.yml` deploys to any host with SSH and Docker Compose, and is off until the repository variable `DEPLOY_ENABLED` is `true` (ADR 0012).

## The alpha's VPS

The alpha runs on an OVHcloud VPS-1 (ADR 0016). `scripts/vps/setup-vps.sh` walks the owner through every step below for it, from the order to `pnpm check:staging` passing against it, and runs `scripts/vps/prepare-host.sh` to harden the host (ADR 0019). It keeps what it asks in `.env.vps`, so a second run picks up where the first stopped.

### Building on the host

The VPS builds the images itself on every deploy (ADR 0012). Measured on staging on 2026-11-22: a build without cache followed by `up --wait`, beside the running stack, peaked at **1346 MiB** of memory the kernel cannot drop (anonymous, kernel and shared memory, summed over Docker's whole `system.slice` cgroup and sampled every 100 ms), against 542 MiB before the build. That fits in the VPS-1's 4 GB with its 2 GB of swap untouched, so ADR 0012 holds. Counting the page cache, which the kernel drops when memory runs short, the peak was 6.1 GiB. Measure again when the build gains a heavy step.

## Turn it on

1. **Prepare the host.** Install Docker Engine, create a deploy user in the `docker` group, open ports 80 and 443, and point the domain's DNS at the host.
2. **Write the host's `.env`** in the deploy path, from `.env.example`, before the first deploy, with a strong password of its own in each of `POSTGRES_PASSWORD`, `LEYLINE_OWNER_PASSWORD` and `LEYLINE_READER_PASSWORD`, the database's roles that `docs/staging.md` explains. `openssl rand -hex 32` prints one (32 random bytes as hex, safe in a URL). PostgreSQL reads them only when it creates its volume: a changed `POSTGRES_PASSWORD` needs `ALTER USER` by hand, a changed role password needs the roles script run again as `docs/staging.md` shows. The `*_DATABASE_URL` lines are for `pnpm` on a development machine and can be left out. If the domain has an IPv6 (AAAA) record, `PUBLISH_ADDRESS=0.0.0.0` publishes on IPv4 only: drop the record, or Let's Encrypt may fail to reach the host.
3. **Make a key pair** for the workflow, and add its public half to the deploy user's `~/.ssh/authorized_keys`:

   ```sh
   ssh-keygen -t ed25519 -N '' -C leyline-deploy -f deploy_key   # -N '': no passphrase, the runner cannot type one
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

   `gh secret set --env production` creates the secret in the `production` environment, so only jobs of that environment can read it. `tester-credentials.caddy` is a file outside the repository holding production's testers, made as `docs/staging.md` says, with a line of its own for `pnpm check:staging`; see [Testers](#testers). Then delete the local `deploy_key`.

6. **Deploy once by hand** to check it: `gh workflow run deploy.yml --ref main`, then `gh run watch` to follow it.

From then on, every push to `main` that passes CI is deployed. `gh variable set DEPLOY_ENABLED --body false` turns it off again.

## Testers

Every deploy writes the `TESTER_CREDENTIALS` secret to `docker/web/tester-credentials.caddy` on the host and reloads Caddy, so the host lets in exactly the testers the secret lists. The secret holds that file whole, in the format `docker/web/tester-credentials.example.caddy` explains. The deploy fails if the secret is empty.

GitHub never shows a secret again, so keep production's `tester-credentials.caddy` outside the repository, where you keep the passwords. To add or revoke a tester, change that file, set the secret again from it, and deploy:

```sh
gh secret set TESTER_CREDENTIALS --env production < tester-credentials.caddy
gh workflow run deploy.yml --ref main
```

After a deploy, `pnpm check:staging --app https://<domain>` checks the host once `CHECK_STAGING_USERNAME` and `CHECK_STAGING_PASSWORD` in the shell hold production's check credential: they take precedence over `.env`'s. Set them with `read -s`, which hides what you type, rather than on a command line, which the shell history keeps.

The access log and the containers' log settings are read through `docker`, not over HTTPS, so point it at the host's engine for that run:

```sh
DOCKER_HOST=ssh://<user>@<host> COMPOSE_PROJECT_NAME=<last folder of DEPLOY_PATH> \
  pnpm check:staging --app https://<domain>
```

`DOCKER_HOST=ssh://...` makes the local `docker` CLI drive the host's Docker over SSH. `COMPOSE_PROJECT_NAME` names the stack as the host knows it: Compose names a project after the folder it runs in. With an `ssh://` address the checks also cover the host itself, its SSH logins, what it lets in from outside, its updates and its swap, all through one SSH connection: the host rate-limits new ones (ADR 0019).

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
