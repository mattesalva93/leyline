# One build for the whole workspace, two runtime targets: `api` and `web`.
#   docker compose up --build            (see compose.yaml)
#   docker build --target api -t leyline-api .

# Versions match mise.toml. Each base image is pinned by the digest of its multi-platform index
# (ADR 0016): `docker buildx imagetools inspect <image:tag>` prints the current one.
FROM node:26.13.1-slim@sha256:abe7e5a82b61a8ef67b315b85497c9e65173387ccf2f4a029248184b8e020be5 AS build
RUN npm install --global pnpm@12.23.0
WORKDIR /app
# Manifests first, so the dependency layer is cached until they change.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json packages/core/
COPY packages/api/package.json packages/api/
COPY packages/web/package.json packages/web/
# `--ignore-scripts` skips `prepare` (husky): no git hooks inside an image.
RUN pnpm install --frozen-lockfile --ignore-scripts
# The web build serves the top changelog entry's changes in version.json.
COPY tsconfig.base.json tsconfig.json CHANGELOG.md ./
COPY packages packages
# The Bugsink DSN the web bundle reports errors with (ADR 0027); empty, the bundle has no SDK.
ARG VITE_BUGSINK_DSN=
RUN pnpm build
# A self-contained copy of `api` with production dependencies only.
RUN pnpm --filter @leyline/api deploy --prod --legacy /deploy/api

FROM node:26.13.1-slim@sha256:abe7e5a82b61a8ef67b315b85497c9e65173387ccf2f4a029248184b8e020be5 AS api
# The api runs `node` only: the bundled npm would ship its own dependencies, and their
# vulnerabilities, for nothing.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
ENV NODE_ENV=production
# The repository's layout around the api: the release it reports errors with is the root
# package.json's version (ADR 0025), read from there.
WORKDIR /app/packages/api
COPY --from=build --chown=node:node /deploy/api ./
COPY --from=build /app/package.json /app/
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]

FROM caddy:2.11-alpine@sha256:003a97808e781aa9f7e75cc2f43d34d461099031faf5e20faefb9f61126836f0 AS web
# Caddy runs as a user of its own (ADR 0016). It still binds 80 and 443 without any capability:
# Docker opens every port to unprivileged processes inside a container's network namespace.
# The directories it writes belong to that user, so a new volume mounted there does too.
RUN addgroup -S caddy && adduser -S -G caddy -H -h /data caddy \
  && mkdir -p /var/log/caddy && chown caddy:caddy /data /config /var/log/caddy
COPY docker/web/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/packages/web/dist /srv
USER caddy
EXPOSE 80 443 443/udp
