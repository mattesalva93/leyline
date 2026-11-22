// Every container has a memory and a CPU limit, so one service running wild cannot starve the
// others on the host (ADR 0016).
import { inspectContainers } from './compose-stack.js';

export async function containerLimitFailures() {
  const failures = [];
  for (const { Config: config, HostConfig: host } of await inspectContainers()) {
    const service = config.Labels['com.docker.compose.service'];
    // Docker reports 0 for no limit; `NanoCpus` holds `cpus`, `CpuQuota` the older `cpu_quota`.
    if (!(host.Memory > 0)) failures.push(`${service} has no memory limit`);
    if (!(host.NanoCpus > 0 || host.CpuQuota > 0)) failures.push(`${service} has no CPU limit`);
  }
  return failures;
}
