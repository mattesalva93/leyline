# One build for the whole workspace, two runtime targets: `api` and `web`.
#   docker compose up --build            (see compose.yaml)
#   docker build --target api -t mtg-suite-api .

# Versions match mise.toml. Each base image is pinned by the digest of its multi-platform index
# (ADR 0016): `docker buildx imagetools inspect <image:tag>` prints the current one.
FROM node:26.13.1-slim@sha256:e6bedef217677b276c591795e169840edd9096dbf13f29df8ef8d1856b8820bc AS build
RUN npm install --global pnpm@12.23.0
WORKDIR /app
# Manifests first, so the dependency layer is cached until they change.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json packages/core/
COPY packages/api/package.json packages/api/
COPY packages/web/package.json packages/web/
# `--ignore-scripts` skips `prepare` (husky): no git hooks inside an image.
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY tsconfig.base.json tsconfig.json ./
COPY packages packages
RUN pnpm build
# A self-contained copy of `api` with production dependencies only.
RUN pnpm --filter @mtg-suite/api deploy --prod --legacy /deploy/api

FROM node:26.13.1-slim@sha256:e6bedef217677b276c591795e169840edd9096dbf13f29df8ef8d1856b8820bc AS api
# The api runs `node` only: the bundled npm would ship its own dependencies, and their
# vulnerabilities, for nothing.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /deploy/api ./
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
