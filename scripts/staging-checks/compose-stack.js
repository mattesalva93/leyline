// Reads the stack from Docker itself, for what a request from outside cannot see. `docker`
// talks to the local engine, or to the VPS's when DOCKER_HOST points there (docs/deploy.md).
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

async function docker(...args) {
  const { stdout } = await execFileAsync('docker', args, { maxBuffer: 64 * 1024 * 1024 });
  return stdout;
}

/** The output of a command run inside the service's container. */
export function execInService(service, ...command) {
  return docker('compose', 'exec', '-T', service, ...command);
}

/** The Compose service a container belongs to. */
export function serviceOf(container) {
  return container.Config.Labels['com.docker.compose.service'];
}

/** Every container of the stack, stopped ones too, as `docker inspect` describes them. */
export async function inspectContainers() {
  const ids = (await docker('compose', 'ps', '--all', '--quiet')).split('\n').filter(Boolean);
  if (ids.length === 0) throw new Error('docker compose finds no container of the stack');
  return JSON.parse(await docker('inspect', ...ids));
}

/** The networks named, as `docker network inspect` describes them. */
export async function inspectNetworks(names) {
  return JSON.parse(await docker('network', 'inspect', ...names));
}

/** The service's environment variables, as its container sees them. */
export async function serviceVariables(service) {
  const container = (await inspectContainers()).find((each) => serviceOf(each) === service);
  if (!container) throw new Error(`the stack has no ${service} container`);
  return Object.fromEntries(
    container.Config.Env.map((entry) => {
      const separator = entry.indexOf('=');
      return [entry.slice(0, separator), entry.slice(separator + 1)];
    }),
  );
}

/**
 * Runs `statements` in one `psql` session as Umami's role, in its retention job's container,
 * which holds `psql` and signs in through libpq's PG* variables. `-tA` prints bare values;
 * ON_ERROR_STOP makes psql exit with an error at the first failing statement.
 */
export function psqlAsUmami(...statements) {
  return execInService(
    'umami-retention',
    ...['psql', '-tA', '-v', 'ON_ERROR_STOP=1'],
    ...statements.flatMap((statement) => ['-c', statement]),
  );
}
