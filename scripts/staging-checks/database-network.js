// PostgreSQL sits on an internal network, never published, that only the api and the importer
// share with it (ADR 0016).
import { execInService, inspectContainers, inspectNetworks, serviceOf } from './compose-stack.js';

const DATABASE_CLIENTS = ['api', 'importer'];

const SERVICE_OFF_THE_DATABASE_NETWORK = 'web';

function publishedPorts({ NetworkSettings: { Ports: ports } }) {
  return Object.entries(ports ?? {})
    .filter(([, bindings]) => bindings?.length > 0)
    .map(([port]) => port);
}

async function networkFailures(postgres, containers) {
  const failures = [];
  const networks = await inspectNetworks(Object.keys(postgres.NetworkSettings.Networks));
  for (const { Name: network, Internal: internal, Containers: attached } of networks) {
    if (!internal) failures.push(`postgres is on ${network}, which is not internal`);
    const others = Object.keys(attached ?? {})
      .map((id) => containers.find((container) => container.Id === id))
      .map((container) => (container ? serviceOf(container) : 'a container outside the stack'))
      .filter((service) => service !== 'postgres' && !DATABASE_CLIENTS.includes(service));
    if (others.length > 0) failures.push(`postgres shares ${network} with ${others.join(', ')}`);
  }
  return failures;
}

/** Tries to open PostgreSQL's port from a service off its network, by name and by each address. */
async function reachabilityFailures(postgres) {
  const addresses = Object.values(postgres.NetworkSettings.Networks)
    .map(({ IPAddress: address }) => address)
    .filter(Boolean);
  const failures = [];
  for (const host of ['postgres', ...addresses]) {
    // `nc -z` only opens the connection; `-w 3` gives up after 3 seconds.
    const reached = await execInService(
      SERVICE_OFF_THE_DATABASE_NETWORK,
      'nc',
      '-z',
      '-w',
      '3',
      host,
      '5432',
    ).then(
      () => true,
      () => false,
    );
    if (reached)
      failures.push(`${SERVICE_OFF_THE_DATABASE_NETWORK} reaches postgres at ${host}:5432`);
  }
  return failures;
}

export async function databaseNetworkFailures() {
  const containers = await inspectContainers();
  const postgres = containers.find((container) => serviceOf(container) === 'postgres');
  if (!postgres) return ['the stack has no postgres container'];
  const ports = publishedPorts(postgres);
  return [
    ...(ports.length > 0 ? [`postgres publishes ${ports.join(', ')}`] : []),
    ...(await networkFailures(postgres, containers)),
    ...(await reachabilityFailures(postgres)),
  ];
}
