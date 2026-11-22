// Every base image is pinned by digest, so a build or a pull never changes under the same tag
// (ADR 0016): the services' own images, and the stages of the Dockerfiles they build.
import { readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { composeModel } from './compose-stack.js';

const PINNED = /@sha256:[0-9a-f]{64}$/;

/** `FROM [--platform=…] <image> [AS <stage>]`, one per line. */
const FROM_LINE = /^FROM\s+(?:--\S+\s+)*(\S+)(?:\s+AS\s+(\S+))?\s*$/gim;

/** The images a Dockerfile starts its stages from, leaving out its own earlier stages. */
function baseImages(dockerfile) {
  const stages = new Set();
  const images = new Set();
  for (const [, image, stage] of dockerfile.matchAll(FROM_LINE)) {
    if (!stages.has(image.toLowerCase())) images.add(image);
    if (stage) stages.add(stage.toLowerCase());
  }
  return images;
}

export async function baseImageFailures() {
  const failures = [];
  const dockerfiles = new Set();
  for (const [service, { image, build }] of Object.entries((await composeModel()).services)) {
    if (build) dockerfiles.add(resolve(build.context, build.dockerfile ?? 'Dockerfile'));
    else if (!PINNED.test(image)) failures.push(`${service} runs ${image}, not pinned by digest`);
  }
  for (const path of dockerfiles) {
    for (const image of baseImages(await readFile(path, 'utf8'))) {
      if (!PINNED.test(image))
        failures.push(
          `${relative(process.cwd(), path)} builds from ${image}, not pinned by digest`,
        );
    }
  }
  return failures;
}
