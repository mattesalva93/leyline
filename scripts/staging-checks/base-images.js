// Every base image is pinned by digest, so a build or a pull never changes under the same tag
// (ADR 0016): the services' own images, and the stages of the Dockerfiles they build.
import { relative } from 'node:path';
import { stackBaseImages } from '../docker/base-images.js';
import { composeModel } from '../docker/compose-model.js';

const SHA256_DIGEST = /^sha256:[0-9a-f]{64}$/;

export async function baseImageFailures() {
  return (await stackBaseImages(await composeModel()))
    .filter(({ digest }) => !SHA256_DIGEST.test(digest ?? ''))
    .map(({ reference, service, dockerfile }) =>
      service
        ? `${service} runs ${reference}, not pinned by digest`
        : `${relative(process.cwd(), dockerfile)} builds from ${reference}, not pinned by digest`,
    );
}
