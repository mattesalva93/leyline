import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/** The stack's configuration as Compose resolves it from compose.yaml and `.env`. */
export async function composeModel() {
  const { stdout } = await execFileAsync('docker', ['compose', 'config', '--format', 'json'], {
    maxBuffer: 64 * 1024 * 1024,
  });
  return JSON.parse(stdout);
}
