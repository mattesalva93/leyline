// Every container runs with the least privilege (ADR 0016).
import { inspectContainers } from './compose-stack.js';

/**
 * The Linux capabilities each service gets back after dropping them all. None needs one: Docker
 * lets unprivileged processes bind any port inside a container, Caddy's 80 and 443 included.
 */
const DECLARED_CAPABILITIES = { web: [], api: [], importer: [], postgres: [] };

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
  const declared = DECLARED_CAPABILITIES[service] ?? [];
  const undeclared = capabilityNames(added).filter((capability) => !declared.includes(capability));
  if (undeclared.length > 0)
    failures.push(`${service} has undeclared capabilities: ${undeclared.join(', ')}`);
  return failures;
}

function serviceName(container) {
  return container.Config.Labels['com.docker.compose.service'];
}

export async function containerPrivilegeFailures() {
  const failures = [];
  for (const container of await inspectContainers()) {
    const service = serviceName(container);
    if (runsAsRoot(container)) failures.push(`${service} runs as root`);
    if (!container.HostConfig.ReadonlyRootfs)
      failures.push(`${service} can write to its filesystem`);
    if (!forbidsNewPrivileges(container)) failures.push(`${service} can gain new privileges`);
    failures.push(...capabilityFailures(service, container));
  }
  return failures;
}
