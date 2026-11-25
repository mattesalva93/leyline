/** `FROM <image>:<tag>@<digest>`: the base images a stage pins by digest (ADR 0016). */
const PINNED_FROM = /^FROM\s+(?:--\S+\s+)*([\w./-]+):([\w.-]+)@(sha256:[0-9a-f]{64})/gim;

/**
 * The base images whose tag the registry now serves under another digest than the pinned one:
 * a rebuild under the same tag, such as Debian's security fixes landing in `node`.
 * `registryDigest(image, tag)` resolves to the digest of the tag's multi-platform index.
 */
export async function outdatedImageDigests(dockerfile, registryDigest) {
  const pinned = new Map();
  for (const [, image, tag, digest] of dockerfile.matchAll(PINNED_FROM)) {
    pinned.set(`${image}:${tag}`, { image, tag, digest });
  }
  const outdated = [];
  for (const [reference, { image, tag, digest }] of pinned) {
    let current;
    try {
      current = await registryDigest(image, tag);
    } catch (error) {
      throw new Error(
        `could not read the digest of ${reference} from its registry: ${error.message}`,
        { cause: error },
      );
    }
    if (current !== digest) outdated.push(`image ${reference}: digest ${digest} → ${current}`);
  }
  return outdated;
}
