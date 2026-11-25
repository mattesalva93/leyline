// Reads a tag's digest from Docker Hub's registry API, without a Docker daemon: the same digest
// `docker buildx imagetools inspect <image:tag>` prints.

/** A closed port can hang instead of refusing, so every request gives up on its own. */
const TIMEOUT_MS = 10_000;

/** The multi-platform index the Dockerfile pins, never one platform's manifest. */
const INDEX_TYPES = [
  'application/vnd.oci.image.index.v1+json',
  'application/vnd.docker.distribution.manifest.list.v2+json',
].join(', ');

async function fetchOk(url, init) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  return response;
}

/** Official images such as `node` live under `library/`. */
export async function dockerHubDigest(image, tag) {
  const repository = image.includes('/') ? image : `library/${image}`;
  const tokenResponse = await fetchOk(
    `https://auth.docker.io/token?service=registry.docker.io&scope=repository:${repository}:pull`,
  );
  const { token } = await tokenResponse.json();
  const manifest = await fetchOk(`https://registry-1.docker.io/v2/${repository}/manifests/${tag}`, {
    method: 'HEAD',
    headers: { Authorization: `Bearer ${token}`, Accept: INDEX_TYPES },
  });
  return manifest.headers.get('docker-content-digest');
}
