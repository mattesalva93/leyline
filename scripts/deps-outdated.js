// Lists every dependency with a newer release: npm packages, mise tools, the workflows' actions
// and the stack's base images, whose tags are also checked for a rebuild under a new digest.
// Run on a work item's branch before its PR, which takes the updates in
// (docs/agents/dependency-updates.md).
//   pnpm deps:outdated
// Needs `gh` logged in, to read the actions' and Caddy's latest releases, and Docker Hub's
// registry, to read the base images' current digests; `docker compose`, to read the stack.
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dockerHubDigest } from './deps-outdated/docker-hub-digest.js';
import { outdatedImageDigests } from './deps-outdated/image-digests.js';
import { stackBaseImages } from './docker/base-images.js';
import { composeModel } from './docker/compose-model.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const WORKFLOWS_DIR = `${ROOT}.github/workflows/`;

/** Runs a command at the repository root; `pnpm outdated` exits with 1 when it finds any. */
function outputOf(command, args) {
  try {
    return execFileSync(command, args, { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
  } catch (error) {
    if (error.stdout) return error.stdout;
    throw error;
  }
}

function latestReleaseTag(repository) {
  return outputOf('gh', ['api', `repos/${repository}/releases/latest`, '--jq', '.tag_name']).trim();
}

function outdatedNpmPackages() {
  const packages = JSON.parse(outputOf('pnpm', ['outdated', '--recursive', '--format', 'json']));
  return Object.entries(packages).map(
    ([name, { current, latest }]) => `npm ${name}: ${current} → ${latest}`,
  );
}

/** Only the tools this repository's mise.toml pins, not the machine's own. */
function outdatedMiseTools() {
  const tools = JSON.parse(outputOf('mise', ['outdated', '--bump', '--json']));
  return Object.values(tools)
    .filter(({ source }) => source.path === `${ROOT}mise.toml`)
    .map(({ name, current, bump }) => `mise ${name}: ${current} → ${bump}`);
}

function outdatedActions() {
  const uses = new Set();
  for (const file of readdirSync(WORKFLOWS_DIR).filter((name) => name.endsWith('.yml'))) {
    const workflow = readFileSync(`${WORKFLOWS_DIR}${file}`, 'utf8');
    for (const [, action] of workflow.matchAll(/uses:\s*([\w.-]+\/[\w.-]+@[\w.-]+)/g)) {
      uses.add(action);
    }
  }
  return [...uses].flatMap((action) => {
    const [repository, tag] = action.split('@');
    const latest = latestReleaseTag(repository);
    return latest === tag ? [] : [`action ${repository}: ${tag} → ${latest}`];
  });
}

/**
 * `node` and the pnpm installed in it follow mise's, and `caddy` its latest minor. `postgres` stays on its major: a new
 * one needs its data migrated, which is a work item of its own.
 */
function outdatedBaseImages(images) {
  const imageTags = Object.fromEntries(images.map(({ name, tag }) => [name, tag]));
  const dockerfile = readFileSync(`${ROOT}Dockerfile`, 'utf8');
  const outdated = [];
  const miseToml = readFileSync(`${ROOT}mise.toml`, 'utf8');
  const miseNode = miseToml.match(/^node = "(.+)"/m)[1];
  if (!imageTags.node.startsWith(`${miseNode}-`)) {
    outdated.push(`image node: ${imageTags.node}, mise.toml has node ${miseNode}`);
  }
  const misePnpm = miseToml.match(/^pnpm = "(.+)"/m)[1];
  const imagePnpm = dockerfile.match(/pnpm@([\w.-]+)/)[1];
  if (imagePnpm !== misePnpm) {
    outdated.push(`image pnpm: ${imagePnpm}, mise.toml has pnpm ${misePnpm}`);
  }
  const caddyMinor = latestReleaseTag('caddyserver/caddy').replace(/^v(\d+\.\d+).*/, '$1');
  if (!imageTags.caddy.startsWith(`${caddyMinor}-`)) {
    outdated.push(`image caddy: ${imageTags.caddy} → ${caddyMinor}-alpine`);
  }
  return outdated;
}

const baseImages = await stackBaseImages(await composeModel());
const outdated = [
  ...outdatedNpmPackages(),
  ...outdatedMiseTools(),
  ...outdatedActions(),
  ...outdatedBaseImages(baseImages),
];
let digestCheckError;
try {
  outdated.push(...(await outdatedImageDigests(baseImages, dockerHubDigest)));
} catch (error) {
  digestCheckError = error;
}
if (outdated.length > 0) console.log(outdated.join('\n'));
if (digestCheckError) {
  console.error(`Base image digests not checked, ${digestCheckError.message}.`);
  process.exitCode = 1;
} else if (outdated.length === 0) {
  console.log('Every dependency is up to date.');
}
