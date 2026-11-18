// Every container's own log rotates, so none grows without limit.
import { inspectContainers } from './compose-stack.js';

/** Docker's `local` driver always rotates; `json-file` only once it has a size limit. */
function rotates({ Type: driver, Config: options }) {
  return driver === 'local' || (driver === 'json-file' && options['max-size'] !== undefined);
}

export async function containerLogRotationFailures() {
  return (await inspectContainers())
    .map(({ Name: name, HostConfig: { LogConfig: logConfig } }) => ({ name, logConfig }))
    .filter(({ logConfig }) => !rotates(logConfig))
    .map(
      ({ name, logConfig }) =>
        `${name.replace(/^\//, '')}: the ${logConfig.Type} log never rotates`,
    );
}
