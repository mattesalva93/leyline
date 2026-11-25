# Deploy

`.github/workflows/deploy.yml` deploys to any host with SSH and Docker Compose, and is off until the repository variable `DEPLOY_ENABLED` is `true` (ADR 0012).

## The alpha's VPS

The alpha runs on an OVHcloud VPS-1 (ADR 0016). `scripts/vps/setup-vps.sh` walks the owner through every step below for it, from the order to `pnpm check:staging` passing against it, and runs `scripts/vps/prepare-host.sh` to harden the host (ADR 0019). It keeps what it asks in `.env.vps`, so a second run picks up where the first stopped.

### Building on the host

The VPS builds the images itself on every deploy (ADR 0012). Measured on staging on 2026-11-22: a build without cache followed by `up --wait`, beside the running stack, peaked at **1346 MiB** of memory the kernel cannot drop (anonymous, kernel and shared memory, summed over Docker's whole `system.slice` cgroup and sampled every 100 ms), against 542 MiB before the build. That fits in the VPS-1's 4 GB with its 2 GB of swap untouched, so ADR 0012 holds. Umami, added on 2026-11-25, was not in that stack: it keeps about 200 MiB more resident beside it. Counting the page cache, which the kernel drops when memory runs short, the peak was 6.1 GiB. Measure again when the build gains a heavy step.

## Turn it on

1. **Prepare the host.** Install Docker Engine, create a deploy user in the `docker` group, open ports 80 and 443, and point the domain's DNS at the host, its `www.` name too: Caddy redirects it to the domain.
2. **Write the host's `.env`** in the deploy path, from `.env.example`, before the first deploy, with a strong password of its own in each of `POSTGRES_PASSWORD`, `LEYLINE_OWNER_PASSWORD`, `LEYLINE_READER_PASSWORD` and `UMAMI_DATABASE_PASSWORD`, the database's roles that `docs/staging.md` explains, and a strong secret in `UMAMI_APP_SECRET`. `openssl rand -hex 32` prints one (32 random bytes as hex, safe in a URL). PostgreSQL reads them only when it creates its volume: a changed `POSTGRES_PASSWORD` needs `ALTER USER` by hand, a changed role password needs the roles script run again as `docs/staging.md` shows. The `*_DATABASE_URL` lines are for `pnpm` on a development machine and can be left out. If the domain has an IPv6 (AAAA) record, `PUBLISH_ADDRESS=0.0.0.0` publishes on IPv4 only: drop the record, or Let's Encrypt may fail to reach the host.
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
   ```

   `gh secret set --env production` creates the secret in the `production` environment, so only jobs of that environment can read it. Leave `TESTER_CREDENTIALS` unset: the alpha is open, and the secret is its emergency switch (see [The testers' guard](#the-testers-guard)). Then delete the local `deploy_key`.

6. **Deploy once by hand** to check it: `gh workflow run deploy.yml --ref main`, then `gh run watch` to follow it.

From then on, every push to `main` that passes CI is deployed. `gh variable set DEPLOY_ENABLED --body false` turns it off again.

A deploy that succeeds then tags the deployed commit `vX.Y.Z`, from the version in its `package.json`, and publishes the GitHub Release of that tag, its notes made by `scripts/release-notes.js` from the commits since the previous tag (ADR 0025). A deploy run again by hand on a version already released leaves the tag and the release as they are; a failed deploy creates neither. `gh release list` shows the releases.

## The testers' guard

The alpha is open to anyone (ADR 0023). Caddy's `basic_auth` stays ready as an emergency switch, for when the site is abused: every deploy reads the `TESTER_CREDENTIALS` secret, and

- with credential lines in it, writes the guard `scripts/tester-guard.sh` makes of them to `docker/web/tester-guard/basic-auth.caddy` on the host, so only the testers the secret lists get in;
- empty or missing, removes that file, so the site is open.

Either way it reloads Caddy. The secret holds a credentials file whole, in the format `docker/web/tester-credentials.example.caddy` explains.

Keep production's `tester-credentials.caddy` outside the repository, where you keep the passwords, made as `docs/staging.md` says with a line of its own for `pnpm check:staging`: GitHub never shows a secret again. To close the site, or to add or revoke a tester while it is closed, set the secret from that file and deploy:

```sh
gh secret set TESTER_CREDENTIALS --env production < tester-credentials.caddy
gh workflow run deploy.yml --ref main
```

To open it again, delete the secret and deploy:

```sh
gh secret delete TESTER_CREDENTIALS --env production
gh workflow run deploy.yml --ref main
```

After a deploy, `pnpm check:staging --access open --app https://<domain>` checks the host. With the guard on, `--access closed` checks it instead, once `CHECK_STAGING_USERNAME` and `CHECK_STAGING_PASSWORD` in the shell hold production's check credential: they take precedence over `.env`'s. Set them with `read -s`, which hides what you type, rather than on a command line, which the shell history keeps.

The access log and the containers' log settings are read through `docker`, not over HTTPS, so point it at the host's engine for that run:

```sh
DOCKER_HOST=ssh://<user>@<host> COMPOSE_PROJECT_NAME=<last folder of DEPLOY_PATH> \
  pnpm check:staging --access open --app https://<domain>
```

`DOCKER_HOST=ssh://...` makes the local `docker` CLI drive the host's Docker over SSH. `COMPOSE_PROJECT_NAME` names the stack as the host knows it: Compose names a project after the folder it runs in. With an `ssh://` address the checks also cover the host itself, its SSH logins, what it lets in from outside, its updates and its swap, all through one SSH connection: the host rate-limits new ones (ADR 0019).

## Error reporting

The browser reports its uncaught errors to Bugsink's managed service through the site's own `/error-reports` path, which Caddy forwards without the client's address, cookies or credential (ADR 0027). The api reports every error that becomes a 500 the same way, through an internal listener of Caddy on the `proxy` network that is never published: the api keeps no route out (ADR 0016). It is off while the host's `.env` leaves its three lines empty. To turn it on, fill them in from the Bugsink project's DSN, `https://<key>@<host>/<project>`:

- `VITE_BUGSINK_DSN`: the DSN whole, built into the web bundle and handed to the api;
- `BUGSINK_ORIGIN`: `https://<host>`, where Caddy forwards the reports;
- `BUGSINK_PROJECT_ID`: `<project>`, the number at the end of the DSN.

Then deploy: the DSN reaches the browser only through a new build of the `web` image, and the privacy notice describes Bugsink from that build on. Emptying the three lines and deploying turns it off again. `pnpm check:staging` checks that the path and the internal listener forward to Bugsink, or that they answer 404 while off, and that the listener does not answer from outside. After turning it on, throw an error in the browser's console (`setTimeout(() => { throw new Error('test') })`) and check that Bugsink shows it under the release the site serves, with no IP address.

To test the api's, send it an error from inside its container through the same reporter the server uses, and check that Bugsink shows it under the same release:

```sh
docker compose exec api node -e "import('./dist/error-reporting/error-reporter-from-env.js').then(async ({ errorReporterFromEnv }) => { (await errorReporterFromEnv()).report(new Error('api test')); setTimeout(() => {}, 2000); })"
```

## Import monitoring

The importer checks in to Healthchecks.io after every import: a ping to the check's URL once it succeeds, to the same URL with `/fail` once it fails (ADR 0027). The ping carries nothing but the outcome. Healthchecks.io emails an alert when a failure checks in, or when no success arrives in time. It is off while the host's `.env` leaves `HEALTHCHECKS_PING_URL` empty.

To turn it on, create a check on Healthchecks.io with the project's mailbox, the address `SECURITY.md` gives, as its email integration, and a **simple** schedule:

- **Period**: 1 day, as often as the importer imports;
- **Grace time**: 3 hours. A failed import alerts at once through its `/fail` ping, and the retries after it check in on their own, so the grace only covers how late a success arrives after the day: the next import starts a day after the last one began (`packages/api/src/catalog-import/daily-imports.ts`), and its success comes once it has run.

Put the check's ping URL, `https://hc-ping.com/<uuid>`, in `HEALTHCHECKS_PING_URL` and deploy. The importer already reaches the internet for Scryfall, so its networks stay as they are. To test it, check in a failure from inside its container through the same check-in the importer uses, and check that the project's mailbox receives the alert; then check in a success, which brings the check back up:

```sh
docker compose exec importer node -e "import('./dist/catalog-import/import-check-in-from-env.js').then(({ importCheckInFromEnv }) => importCheckInFromEnv()('failed'))"
docker compose exec importer node -e "import('./dist/catalog-import/import-check-in-from-env.js').then(({ importCheckInFromEnv }) => importCheckInFromEnv()('succeeded'))"
```

## Product analytics

Umami runs on the host beside the app, with a database of its own (ADR 0027). The public site reaches only the path that receives product events, `/product-events`, which Caddy forwards with no address of the client: Umami hashes none into a visitor's session, whose salt it changes every day. Its dashboard is never on the site, and opens only through an SSH tunnel to the container. Umami's container sits on internal networks only, with no route out of Docker, and the host reaches it at its address on them:

```sh
# The container's address on its first network: the host routes to Docker's networks itself.
umami=$(ssh <user>@<host> "cd <DEPLOY_PATH> && docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}' \$(docker compose ps -q umami)" | cut -d' ' -f1)
ssh -N -L 3001:"$umami":3000 <user>@<host>   # -N: no remote command, only the tunnel
```

While the tunnel is open, `http://localhost:3001` on this machine is Umami's dashboard. The address changes when the container is created again, so look it up each time. On the first sign-in, as `admin` with the password `umami` that Umami starts with, change that password at once, under _Settings → Security_: the site never exposes the login, but anyone on the host does reach it.

`pnpm check:staging` checks that the site reaches Umami at the events path only, and that Umami hashes no address of the client.

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

The branch rulesets that also became available then are in [Branch protection](branch-protection.md).
