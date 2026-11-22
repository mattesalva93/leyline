// The VPS lets no one in with a password, and no one as root (ADR 0019). Each attempt is a
// connection of its own, apart from the checks' shared one, so it really logs in.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/** What sshd says when it turns a client away: "Permission denied (publickey)." */
const DENIAL = /Permission denied \(([^)]*)\)/;

/** sshd's answer once a client has tried more keys than its MaxAuthTries. */
const TOO_MANY_KEYS = /Too many authentication failures/;

/** Tries to log in and run `true`; resolves to the methods sshd offered, or null if it let in. */
async function loginAttempt(port, destination, options) {
  // BatchMode: never prompt, so a password login fails at once instead of waiting for one.
  // ControlPath=none: never ride on a shared connection, from these checks or ~/.ssh/config.
  const args = ['-p', port, '-o', 'BatchMode=yes', '-o', 'ControlPath=none', ...options];
  return execFileAsync('ssh', [...args, destination, 'true']).then(
    () => null,
    (error) => {
      const stderr = error.stderr ?? '';
      const denial = DENIAL.exec(stderr);
      if (denial) return denial[1].split(',');
      if (TOO_MANY_KEYS.test(stderr)) return ['publickey'];
      throw new Error(`ssh failed without a denial: ${stderr.trim()}`);
    },
  );
}

/** @param {{ vps: { destination: string, hostname: string, port: string } }} staging */
export async function sshLoginFailures({ vps }) {
  const failures = [];
  const { destination, hostname, port } = vps;
  const offered = await loginAttempt(port, destination, ['-o', 'PubkeyAuthentication=no']);
  if (offered === null) failures.push(`${destination} logs in without a key`);
  else if (offered.join(',') !== 'publickey')
    failures.push(`sshd offers ${offered.join(', ')}, expected publickey only`);
  // Root tries the same keys the deploy user logs in with.
  if ((await loginAttempt(port, `root@${hostname}`, [])) === null)
    failures.push('root logs in over SSH');
  return failures;
}
