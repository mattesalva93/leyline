// When DOCKER_HOST points at the VPS over SSH, every check reaches it through one shared SSH
// connection. The VPS rate-limits new SSH connections (ADR 0019), and `docker` would otherwise
// open one per command.
import { execFile, spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * The VPS a `ssh://user@host:port` DOCKER_HOST names, or undefined for a local engine.
 * @param {string | undefined} dockerHost
 */
export function vpsOf(dockerHost) {
  if (!dockerHost?.startsWith('ssh://')) return undefined;
  const { username, hostname, port } = new URL(dockerHost);
  return { user: username, hostname, port: port || '22' };
}

/** Runs ssh to its end, without waiting for a background master that keeps its output open. */
function runSsh(args) {
  return new Promise((resolve, reject) => {
    const ssh = spawn('ssh', args, { stdio: ['ignore', 'ignore', 'inherit'] });
    ssh.on('error', reject);
    ssh.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`ssh exited with ${code}`)),
    );
  });
}

/**
 * Opens the shared connection: a master that forwards the VPS's Docker socket to a local one.
 * @param {{ user: string, hostname: string, port: string }} vps
 */
export async function openVpsConnection(vps) {
  const folder = await mkdtemp(join(tmpdir(), 'check-vps-'));
  const control = join(folder, 'control');
  const dockerSocket = join(folder, 'docker.sock');
  const destination = vps.user ? `${vps.user}@${vps.hostname}` : vps.hostname;
  // `-S`: the control socket later commands share the connection through.
  const shared = ['-p', vps.port, '-S', control];
  // `-M -f -N`: a master that goes to the background once connected and runs no command.
  // ExitOnForwardFailure: fail now if the socket cannot be forwarded, not on the first check.
  await runSsh([
    ...shared,
    '-M',
    '-f',
    '-N',
    '-o',
    'ExitOnForwardFailure=yes',
    '-L',
    `${dockerSocket}:/var/run/docker.sock`,
    destination,
  ]);
  return {
    ...vps,
    dockerHost: `unix://${dockerSocket}`,
    /** The output of a shell command run on the VPS as the deploy user. */
    async run(command) {
      const { stdout } = await execFileAsync('ssh', [...shared, destination, command]);
      return stdout;
    },
    async close() {
      await runSsh([...shared, '-q', '-O', 'exit', destination]).catch(() => {});
      await rm(folder, { recursive: true, force: true });
    },
  };
}
