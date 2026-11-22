// Every container runs with the least privilege (ADR 0016).
import { inspectContainers, serviceOf } from './compose-stack.js';

/** Docker starts the process as root when the image and the service name no user, or name root. */
function runsAsRoot({ Config: { User: user } }) {
  const [name] = user.split(':');
  return name === '' || name === 'root' || name === '0';
}

/** `security_opt` accepts `no-new-privileges`, `no-new-privileges=true` and `:true` alike. */
function forbidsNewPrivileges({ HostConfig: { SecurityOpt: options } }) {
  return (options ?? []).some((option) => /^no-new-privileges([:=]true)?$/.test(option));
}

/** Docker names capabilities with or without the `CAP_` prefix, in any case. */
function capabilityNames(capabilities) {
  return (capabilities ?? []).map((capability) => capability.toUpperCase().replace(/^CAP_/, ''));
}

function capabilityFailures(service, { HostConfig: { CapDrop: dropped, CapAdd: added } }) {
  const failures = [];
  if (!capabilityNames(dropped).includes('ALL'))
    failures.push(`${service} keeps Docker's default capabilities`);
  // No service needs one back (Dockerfile, `web` stage): a capability added later fails here, so
  // it comes with a change to this check.
  const regained = capabilityNames(added);
  if (regained.length > 0)
    failures.push(`${service} gets capabilities back: ${regained.join(', ')}`);
  return failures;
}

export async function containerPrivilegeFailures() {
  const failures = [];
  for (const container of await inspectContainers()) {
    const service = serviceOf(container);
    if (runsAsRoot(container)) failures.push(`${service} runs as root`);
    if (!container.HostConfig.ReadonlyRootfs)
      failures.push(`${service} can write to its filesystem`);
    if (!forbidsNewPrivileges(container)) failures.push(`${service} can gain new privileges`);
    failures.push(...capabilityFailures(service, container));
  }
  return failures;
}
