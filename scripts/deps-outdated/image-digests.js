/**
 * The base `images` (as `stackBaseImages` lists them) whose tag the registry now serves under
 * another digest than the pinned one: a rebuild under the same tag, such as Debian's security
 * fixes landing in `node`. `registryDigest(image, tag)` resolves to the digest of the tag's
 * multi-platform index.
 */
export async function outdatedImageDigests(images, registryDigest) {
  const outdated = [];
  for (const { name, tag, digest } of images) {
    const reference = `${name}:${tag}`;
    let current;
    try {
      current = await registryDigest(name, tag);
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
