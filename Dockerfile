# One build for the whole workspace, two runtime targets: `api` and `web`.
#   docker compose up --build            (see compose.yaml)
#   docker build --target api -t mtg-suite-api .

# Versions match mise.toml.
FROM node:26.13.1-slim AS build
RUN npm install --global pnpm@12.21.0
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

FROM node:26.13.1-slim AS api
# The api runs `node` only: the bundled npm would ship its own dependencies, and their
# vulnerabilities, for nothing.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /deploy/api ./
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]

FROM caddy:2.11-alpine AS web
COPY docker/web/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/packages/web/dist /srv
EXPOSE 80 443 443/udp
