# Local staging

Staging is the production stack (`compose.yaml`) running on this machine: Caddy serving the web app and `/api` over HTTPS, `api`, `importer` and PostgreSQL (ADR 0011). It answers on https://localhost, open to anyone like the alpha (ADR 0023), and is updated by hand.

## The testers' guard

The site is open while `docker/web/tester-guard/` holds no `.caddy` file (ADR 0023). The testers' guard, the emergency switch, lets in only the testers listed in `docker/web/tester-credentials.caddy`, a file git ignores. Create it once from the example, which explains its format:

```sh
cp docker/web/tester-credentials.example.caddy docker/web/tester-credentials.caddy
```

Make one credential per tester, with a long random password and its `argon2id` hash:

```sh
password=$(openssl rand -base64 33)   # 33 random bytes, printed as 44 base64 characters
printf '%s\n' "$password" | docker compose run --rm --no-deps -T web caddy hash-password --algorithm argon2id
```

The hash comes from the stack's own Caddy image. `--no-deps` starts no other service, and `-T` gives the command no terminal, so `caddy hash-password` reads the password from the pipe and it never appears on a command line. Add `<username> <hash>` as one line of the file, and give the tester their password over a private channel. Removing a line revokes that tester.

Turn the guard on, or pick up a changed credential, by writing the guard from the file and reloading Caddy:

```sh
sh scripts/tester-guard.sh < docker/web/tester-credentials.caddy > docker/web/tester-guard/basic-auth.caddy
docker compose exec web caddy reload --config /etc/caddy/Caddyfile
```

Turn it off, opening the site again, by removing the guard and reloading:

```sh
rm docker/web/tester-guard/basic-auth.caddy
docker compose exec web caddy reload --config /etc/caddy/Caddyfile
```

`compose.yaml` mounts the folder, not the file, so a reload sees the guard written or removed.

`pnpm check:staging` takes the state the guard should be in: `--access open`, or `--access closed`, where it signs in with a credential of its own. Make one as above for a username such as `check-staging`, add its line to the file, and put the username and the password in `.env` as `CHECK_STAGING_USERNAME` and `CHECK_STAGING_PASSWORD`.

## Start

From the repository root, on this machine (not inside a container):

```sh
docker compose up -d --wait
```

It needs the `.env` file (`cp .env.example .env`). `docker compose` reads it from the repository root on this machine, before starting anything, to fill the `${...}` values in `compose.yaml`; the containers never see the file itself. The database roles' passwords have no default there, so `docker compose` stops without them; for everything else, `compose.yaml`'s own defaults are the staging values. `pnpm dev` reads the same file.

`--wait` returns once every service is running or healthy. Images are rebuilt on every `up` (`pull_policy: build`), so the stack always runs the code checked out. On the first start the `importer` fills the catalog (a few minutes), and decklists find no cards until it is done: `docker compose logs -f importer` follows it.

The `api` reports itself healthy only once the `importer` has created the database schema, a few seconds after PostgreSQL starts: it never creates it itself.

Caddy's access log is a file of its own, apart from `docker compose logs`: `docker compose exec web tail -f /var/log/caddy/access.log` follows it.

## Error reports

`pnpm check:staging` proves that Caddy strips the client's address, cookies and credential from an error report on its way to Bugsink (ADR 0027), from the browser's path and from the api's internal listener alike, against a stub of Bugsink that answers with what it received. Point local staging at the stub in `.env`, and rebuild with `docker compose up -d --wait`: `BUGSINK_ORIGIN` set to `STUB_ORIGIN` in `scripts/staging-checks/error-reports.js`, any number in `BUGSINK_PROJECT_ID`, and in `VITE_BUGSINK_DSN` any DSN with a hexadecimal key, as Bugsink's are (the SDK ignores any other), so that the page runs the SDK too.

The check starts the stub on the stack's `internet` network for the length of its own run, and stops it after. Left empty, the three lines turn error reporting off, and the check only sees that `/error-reports` and the internal listener answer 404.

## Caddy's volumes from before its own user

Caddy runs as the `caddy` user of the `web` image (ADR 0016). Volumes it created earlier, as root, hold files that user cannot read, so Caddy fails to start on them. Hand them over once:

```sh
docker compose stop web
docker compose run --rm --no-deps --build --user root --cap-add CHOWN --entrypoint chown web -R caddy:caddy /data /config /var/log/caddy
docker compose up -d --wait
```

`--user root` and `--cap-add CHOWN` give this one throwaway container back the privileges the service drops; `--entrypoint chown` runs `chown` instead of Caddy. Certificates, the local CA and the access log stay as they were.

## Database roles

PostgreSQL has three roles (ADR 0016):

- the superuser, `POSTGRES_USER`, only initialises the database;
- `leyline_owner` owns the schema and is the `importer`'s: it migrates the database before each import;
- `leyline_reader` is the `api`'s: it can only read, and its queries stop after a statement timeout.

`docker/postgres/init/02-database-roles.sh` creates the two roles, with the passwords in `LEYLINE_OWNER_PASSWORD` and `LEYLINE_READER_PASSWORD`, when PostgreSQL creates its volume. A volume created before the roles existed gets them, and hands its tables to `leyline_owner`, by running the same script once:

```sh
docker compose up -d --wait postgres
docker compose exec -T postgres sh /docker-entrypoint-initdb.d/02-database-roles.sh
docker compose up -d --wait
```

`exec -T` runs the script inside the running container with no terminal; it reads the passwords from the container's environment. The script is safe to run again, and running it is also how a changed password reaches an existing volume.

`pnpm test` creates its throwaway schemas as the superuser, or as the role in `TEST_DATABASE_URL`.

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
