// Every container runs with the least privilege (ADR 0016).
import { inspectContainers } from './compose-stack.js';

/** Docker starts the process as root when the image and the service name no user, or name root. */
function runsAsRoot({ Config: { User: user } }) {
  const [name] = user.split(':');
  return name === '' || name === 'root' || name === '0';
}

function serviceName(container) {
  return container.Config.Labels['com.docker.compose.service'];
}

export async function containerPrivilegeFailures() {
  const failures = [];
  for (const container of await inspectContainers()) {
    const service = serviceName(container);
    if (runsAsRoot(container)) failures.push(`${service} runs as root`);
  }
  return failures;
}
