import { describe, expect, it } from 'vitest';
import { outdatedImageDigests } from './image-digests.js';

const PINNED_NODE = 'sha256:e6bedef217677b276c591795e169840edd9096dbf13f29df8ef8d1856b8820bc';
const REBUILT_NODE = 'sha256:abe7e5a82b61a8ef67b315b85497c9e65173387ccf2f4a029248184b8e020be5';
const PINNED_CADDY = 'sha256:003a97808e781aa9f7e75cc2f43d34d461099031faf5e20faefb9f61126836f0';

const dockerfile = `FROM node:26.13.1-slim@${PINNED_NODE} AS build
RUN npm install --global pnpm@12.23.0
FROM node:26.13.1-slim@${PINNED_NODE} AS api
FROM caddy:2.11-alpine@${PINNED_CADDY} AS web
COPY --from=build /app/packages/web/dist /srv
`;

/** A registry that serves `digests`, keyed by `image:tag`. */
const registry = (digests) => async (image, tag) => digests[`${image}:${tag}`];

describe('outdatedImageDigests', () => {
  it('lists an image whose tag the registry serves under a new digest, once per tag', async () => {
    const outdated = await outdatedImageDigests(
      dockerfile,
      registry({ 'node:26.13.1-slim': REBUILT_NODE, 'caddy:2.11-alpine': PINNED_CADDY }),
    );
    expect(outdated).toEqual([`image node:26.13.1-slim: digest ${PINNED_NODE} → ${REBUILT_NODE}`]);
  });

  it('fails naming the image when the registry does not answer, instead of calling it current', async () => {
    const unreachable = async () => {
      throw new TypeError('fetch failed');
    };
    await expect(outdatedImageDigests(dockerfile, unreachable)).rejects.toThrow(
      'could not read the digest of node:26.13.1-slim from its registry: fetch failed',
    );
  });
});
