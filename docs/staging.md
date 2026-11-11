# Local staging

Staging is the production stack (`compose.yaml`) running on this machine: Caddy serving the web app and `/api` over HTTPS, `api`, `importer` and PostgreSQL (ADR 0011). It answers on https://localhost and is updated by hand.

## Start

```sh
cp .env.example .env     # once; the defaults are the staging values
docker compose up -d --wait
```

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

- **Windows browsers** (Chrome, Edge): open `\\wsl$\Ubuntu-24.04\home\<user>\caddy-local-root.crt` from Explorer, then _Install certificate_ → _Local machine_ → _Trusted Root Certification Authorities_.
- **curl inside WSL**: `curl --cacert ~/caddy-local-root.crt https://localhost/`.

The CA stays the same as long as the `caddy-data` volume exists.

## Stop

```sh
docker compose down      # keeps the volumes
docker compose down -v   # also deletes the database and the certificates
```
