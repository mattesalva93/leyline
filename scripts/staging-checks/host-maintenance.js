// The VPS installs its security updates by itself and has 2 GiB of swap for building the images
// beside the running stack (ADR 0012), as scripts/vps/prepare-host.sh sets it up.

const GIB = 1024 ** 3;

/** `mkswap` keeps the file's first page for its header, so 2 GiB of file swaps a page less. */
const SWAP_HEADER_ALLOWANCE = 1024 ** 2;

/**
 * @param {{ vps: { run: (command: string) => Promise<string> } }} staging
 */
export async function hostMaintenanceFailures({ vps }) {
  const failures = [];
  const service = (await vps.run('systemctl is-active unattended-upgrades || true')).trim();
  if (service !== 'active')
    failures.push(`unattended-upgrades is ${service || 'unknown'}, expected active`);
  // `apt-config dump <option>` prints the option as apt reads it, after every conf.d file.
  const periodic = await vps.run('apt-config dump APT::Periodic::Unattended-Upgrade');
  if (!periodic.includes('APT::Periodic::Unattended-Upgrade "1";'))
    failures.push('apt never runs unattended-upgrade: APT::Periodic::Unattended-Upgrade is not 1');
  // `--bytes --noheadings`: one bare size per swap area.
  const swapBytes = (await vps.run('swapon --show=SIZE --bytes --noheadings'))
    .split('\n')
    .filter(Boolean)
    .reduce((total, size) => total + Number(size), 0);
  if (swapBytes < 2 * GIB - SWAP_HEADER_ALLOWANCE)
    failures.push(`swap is ${(swapBytes / GIB).toFixed(2)} GiB, expected 2`);
  return failures;
}
