// The VPS lets no one in with a password, and no one as root (ADR 0019). Each attempt is a
// connection of its own, apart from the checks' shared one, so it really logs in.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/** What sshd says when it turns a client away: "Permission denied (publickey)." */
const DENIAL = /Permission denied \(([^)]*)\)/;

/** Tries to log in and run `true`; resolves to the methods sshd offered, or null if it let in. */
async function loginAttempt({ hostname, port }, user, options) {
  // BatchMode: never prompt, so a password login fails at once instead of waiting for one.
  // ControlPath=none: never ride on a shared connection, from these checks or ~/.ssh/config.
  const args = ['-p', port, '-o', 'BatchMode=yes', '-o', 'ControlPath=none', ...options];
  return execFileAsync('ssh', [...args, `${user}@${hostname}`, 'true']).then(
    () => null,
    (error) => {
      const denial = DENIAL.exec(error.stderr ?? '');
      if (!denial) throw new Error(`ssh failed without a denial: ${error.stderr?.trim()}`);
      return denial[1].split(',');
    },
  );
}

/** @param {{ vps: { user: string, hostname: string, port: string } }} staging */
export async function sshLoginFailures({ vps }) {
  const failures = [];
  const offered = await loginAttempt(vps, vps.user, ['-o', 'PubkeyAuthentication=no']);
  if (offered === null) failures.push(`${vps.user} logs in without a key`);
  else if (offered.join(',') !== 'publickey')
    failures.push(`sshd offers ${offered.join(', ')}, expected publickey only`);
  if ((await loginAttempt(vps, 'root', [])) === null) failures.push('root logs in over SSH');
  return failures;
}
