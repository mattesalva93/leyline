import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { stackBaseImages } from './base-images.js';

const NODE = 'sha256:abe7e5a82b61a8ef67b315b85497c9e65173387ccf2f4a029248184b8e020be5';
const CADDY = 'sha256:003a97808e781aa9f7e75cc2f43d34d461099031faf5e20faefb9f61126836f0';
const POSTGRES = 'sha256:0115267ab5a509022df9319c77be365cef335adb71556c75f60f5360ee247e71';

let context;

beforeEach(() => {
  context = mkdtempSync(join(tmpdir(), 'base-images-'));
});

afterEach(() => {
  rmSync(context, { recursive: true, force: true });
});

/** `docker compose config`'s model of a stack whose services build from `dockerfile`. */
function stackBuilding(dockerfile) {
  writeFileSync(join(context, 'Dockerfile'), dockerfile);
  const build = (target) => ({ context, dockerfile: 'Dockerfile', target });
  return {
    services: {
      api: { image: null, build: build('api') },
      importer: { image: null, build: build('api') },
      postgres: { image: `postgres:18-alpine@${POSTGRES}`, build: null },
      web: { image: null, build: build('web') },
    },
  };
}

describe('stackBaseImages', () => {
  it("lists the services' images and the Dockerfile's base images, once per reference", async () => {
    const model = stackBuilding(`FROM node:26.13.1-slim@${NODE} AS build
RUN npm install --global pnpm@12.23.0
FROM node:26.13.1-slim@${NODE} AS api
FROM caddy:2.11-alpine@${CADDY} AS web
`);
    expect(await stackBaseImages(model)).toEqual([
      {
        reference: `postgres:18-alpine@${POSTGRES}`,
        name: 'postgres',
        tag: '18-alpine',
        digest: POSTGRES,
        service: 'postgres',
      },
      {
        reference: `node:26.13.1-slim@${NODE}`,
        name: 'node',
        tag: '26.13.1-slim',
        digest: NODE,
        dockerfile: join(context, 'Dockerfile'),
      },
      {
        reference: `caddy:2.11-alpine@${CADDY}`,
        name: 'caddy',
        tag: '2.11-alpine',
        digest: CADDY,
        dockerfile: join(context, 'Dockerfile'),
      },
    ]);
  });

  it("leaves out the Dockerfile's own stages and reads past a --platform flag", async () => {
    const model = stackBuilding(`FROM --platform=$BUILDPLATFORM node:26.13.1-slim@${NODE} AS build
RUN npm install --global pnpm@12.23.0
FROM build AS api
FROM caddy:2.11-alpine@${CADDY} AS web
`);
    const references = (await stackBaseImages(model)).map(({ reference }) => reference);
    expect(references).toEqual([
      `postgres:18-alpine@${POSTGRES}`,
      `node:26.13.1-slim@${NODE}`,
      `caddy:2.11-alpine@${CADDY}`,
    ]);
  });
});
