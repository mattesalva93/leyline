// The one reading of which images the stack starts from: what the staging check holds to a
// digest pin (ADR 0016) and what `pnpm deps:outdated` checks for updates.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/** `FROM [--platform=…] <image> [AS <stage>]`, one per line. */
const FROM_LINE = /^FROM\s+(?:--\S+\s+)*(\S+)(?:\s+AS\s+(\S+))?\s*$/gim;

/** `<name>[:<tag>][@<digest>]`; a registry's `host:port/` prefix is part of the name. */
function parseReference(reference) {
  const [nameAndTag, digest] = reference.split('@');
  const tagStart = nameAndTag.lastIndexOf(':');
  const hasTag = tagStart > nameAndTag.lastIndexOf('/');
  return {
    reference,
    name: hasTag ? nameAndTag.slice(0, tagStart) : nameAndTag,
    tag: hasTag ? nameAndTag.slice(tagStart + 1) : undefined,
    digest,
  };
}

/** The images a Dockerfile starts its stages from, leaving out its own earlier stages. */
function dockerfileBaseImages(dockerfile) {
  const stages = new Set();
  const images = new Set();
  for (const [, image, stage] of dockerfile.matchAll(FROM_LINE)) {
    if (!stages.has(image.toLowerCase())) images.add(image);
    if (stage) stages.add(stage.toLowerCase());
  }
  return images;
}

/**
 * Every image the stack of `composeModel` (`docker compose config`'s output) starts from, once
 * per reference: a service's `image`, with that `service`, and the base images of the Dockerfiles
 * the others build, with that `dockerfile`'s path.
 */
export async function stackBaseImages(composeModel) {
  const images = new Map();
  const dockerfiles = new Set();
  for (const [service, { image, build }] of Object.entries(composeModel.services)) {
    if (build) dockerfiles.add(resolve(build.context, build.dockerfile ?? 'Dockerfile'));
    else if (!images.has(image)) images.set(image, { ...parseReference(image), service });
  }
  for (const dockerfile of dockerfiles) {
    for (const image of dockerfileBaseImages(await readFile(dockerfile, 'utf8'))) {
      if (!images.has(image)) images.set(image, { ...parseReference(image), dockerfile });
    }
  }
  return [...images.values()];
}
