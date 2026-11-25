import { describe, expect, it } from 'vitest';
import { outdatedImageDigests } from './image-digests.js';

const PINNED_NODE = 'sha256:e6bedef217677b276c591795e169840edd9096dbf13f29df8ef8d1856b8820bc';
const REBUILT_NODE = 'sha256:abe7e5a82b61a8ef67b315b85497c9e65173387ccf2f4a029248184b8e020be5';
const PINNED_CADDY = 'sha256:003a97808e781aa9f7e75cc2f43d34d461099031faf5e20faefb9f61126836f0';
const PINNED_POSTGRES = 'sha256:0115267ab5a509022df9319c77be365cef335adb71556c75f60f5360ee247e71';

/** The stack's base images, as `stackBaseImages` lists them. */
const images = [
  { name: 'postgres', tag: '18-alpine', digest: PINNED_POSTGRES },
  { name: 'node', tag: '26.13.1-slim', digest: PINNED_NODE },
  { name: 'caddy', tag: '2.11-alpine', digest: PINNED_CADDY },
];

/** A registry that serves `digests`, keyed by `image:tag`. */
const registry = (digests) => async (image, tag) => digests[`${image}:${tag}`];

describe('outdatedImageDigests', () => {
  it('lists an image whose tag the registry serves under a new digest', async () => {
    const outdated = await outdatedImageDigests(
      images,
      registry({
        'postgres:18-alpine': PINNED_POSTGRES,
        'node:26.13.1-slim': REBUILT_NODE,
        'caddy:2.11-alpine': PINNED_CADDY,
      }),
    );
    expect(outdated).toEqual([`image node:26.13.1-slim: digest ${PINNED_NODE} → ${REBUILT_NODE}`]);
  });

  it('fails naming the image when the registry does not answer, instead of calling it current', async () => {
    const unreachable = async () => {
      throw new TypeError('fetch failed');
    };
    await expect(outdatedImageDigests(images, unreachable)).rejects.toThrow(
      'could not read the digest of postgres:18-alpine from its registry: fetch failed',
    );
  });
});
