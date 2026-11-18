# Local staging

Staging is the production stack (`compose.yaml`) running on this machine: Caddy serving the web app and `/api` over HTTPS, `api`, `importer` and PostgreSQL (ADR 0011). It answers on https://localhost, to the testers' credentials only, and is updated by hand.

## Tester credentials

Caddy lets in only the testers listed in `docker/web/tester-credentials.caddy` (ADR 0016), a file git ignores and `docker compose up` refuses to start without. Create it once from the example, which explains its format:

```sh
cp docker/web/tester-credentials.example.caddy docker/web/tester-credentials.caddy
```

Make one credential per tester, with a long random password and its `argon2id` hash:

```sh
password=$(openssl rand -base64 33)   # 33 random bytes, printed as 44 base64 characters
printf '%s\n' "$password" | docker run --rm -i caddy:2-alpine caddy hash-password --algorithm argon2id
```

`-i` keeps stdin open, so `caddy hash-password` reads the password from the pipe and it never appears on a command line. Add `<username> <hash>` as one line of the file, and give the tester their password over a private channel. Removing a line revokes that tester. A running stack picks a change up with:

```sh
docker compose restart web
```

`restart` rather than `caddy reload`: an editor that saves by replacing the file leaves the running container on the old one, and only a restart mounts the new one.

`pnpm check:staging` signs in with a credential of its own: make one as above for a username such as `check-staging`, add its line to the file, and put the username and the password in `.env` as `CHECK_STAGING_USERNAME` and `CHECK_STAGING_PASSWORD`.

## Start

From the repository root, on this machine (not inside a container):

```sh
docker compose up -d --wait
```

The `.env` file is optional here. `docker compose` reads it from the repository root on this machine, before starting anything, to fill the `${...}` values in `compose.yaml`; the containers never see the file itself. Without it, `compose.yaml`'s own defaults are the staging values. `pnpm dev` needs it (`cp .env.example .env`), and the same file serves both.

`--wait` returns once every service is running or healthy. Images are rebuilt on every `up` (`pull_policy: build`), so the stack always runs the code checked out. On the first start the `importer` fills the catalog (a few minutes), and decklists find no cards until it is done: `docker compose logs -f importer` follows it.

## Update

Staging runs what `main` holds on GitHub:

```sh
git switch main
git pull --ff-only
docker compose up -d --wait --remove-orphans
```

`--remove-orphans` stops containers of services that no longer exist in `compose.yaml`. The database and the certificates live in volumes and survive the update.

## Trust the local certificate

Caddy signs the `localhost` certificate with its own CA, which browsers do not know. Copy its root certificate out of the container:

```sh
docker compose cp web:/data/caddy/pki/authorities/local/root.crt ~/caddy-local-root.crt
```

Windows reaches the WSL home as `\\wsl.localhost\<distro>\home\<user>\` (`echo $WSL_DISTRO_NAME` prints the distro).

- **Firefox**: _Settings_ → _Privacy & Security_ → _Certificates_ → _View Certificates…_ → _Authorities_ → _Import…_, pick `caddy-local-root.crt`, and tick _Trust this CA to identify websites_. Firefox can keep its own list of authorities apart from Windows', so import it there directly.
- **Chrome, Edge**: open the file from Explorer, then _Install certificate_ → _Current user_ → _Trusted Root Certification Authorities_.
- **curl inside WSL**: `curl --cacert ~/caddy-local-root.crt https://localhost/`.

The CA stays the same as long as the `caddy-data` volume exists.

## Stop

```sh
docker compose down      # keeps the volumes
docker compose down -v   # also deletes the database and the certificates
```
