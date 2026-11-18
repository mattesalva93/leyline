// Every container's own log rotates, so none grows without limit.
import { inspectContainers } from './compose-stack.js';

/** Docker's `local` driver always rotates; `json-file` only once it has a size limit. */
function rotates({ Type: driver, Config: options }) {
  return driver === 'local' || (driver === 'json-file' && options['max-size'] !== undefined);
}

export async function containerLogRotationFailures() {
  return (await inspectContainers())
    .filter((container) => !rotates(container.HostConfig.LogConfig))
    .map(
      (container) =>
        `${container.Name.replace(/^\//, '')}: the ${container.HostConfig.LogConfig.Type} log never rotates`,
    );
}
