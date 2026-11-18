// The api connects as `mtg_reader`, which reads the catalog but can neither write to it nor create
// anything, and has a statement timeout; the importer connects as `mtg_owner` (ADR 0016).
import { execInService, inspectContainers } from './compose-stack.js';

/** The role each service's database URL connects as. */
const SERVICE_ROLES = {
  api: { variable: 'READER_DATABASE_URL', role: 'mtg_reader' },
  importer: { variable: 'OWNER_DATABASE_URL', role: 'mtg_owner' },
};

/** Statements `mtg_reader` must be refused, each in a transaction that never commits. */
const FORBIDDEN_TO_THE_READER = {
  'insert into the catalog': 'insert into catalog_imports values (now())',
  'delete from the catalog': 'delete from prints',
  'create a table': 'create table check_staging_probe (id int)',
  'create a temporary table': 'create temporary table check_staging_probe (id int)',
  'create a schema': 'create schema check_staging_probe',
};

/**
 * Runs `statements` as `mtg_reader`, over the container's own socket. `-tA` prints bare values;
 * ON_ERROR_STOP makes psql exit with an error at the first failing statement.
 */
function psqlAsReader(...statements) {
  return execInService(
    'postgres',
    'sh',
    '-c',
    'psql -U mtg_reader -d "$POSTGRES_DB" -tA -v ON_ERROR_STOP=1 "$@"',
    'psql',
    ...statements.flatMap((statement) => ['-c', statement]),
  );
}

async function serviceRoleFailures() {
  const containers = await inspectContainers();
  return Object.entries(SERVICE_ROLES).flatMap(([service, { variable, role }]) => {
    const container = containers.find(
      ({ Config: { Labels: labels } }) => labels['com.docker.compose.service'] === service,
    );
    if (!container) return [`no ${service} container`];
    const url = container.Config.Env.find((entry) => entry.startsWith(`${variable}=`));
    if (!url) return [`${service} has no ${variable}`];
    const user = new URL(url.slice(variable.length + 1)).username;
    return user === role ? [] : [`${service} connects as ${user}, expected ${role}`];
  });
}

async function readerFailures() {
  const failures = [];
  const [timeout, prints] = (
    await psqlAsReader('show statement_timeout', 'select count(*) from prints')
  ).split('\n');
  if (timeout === '0') failures.push('mtg_reader has no statement timeout');
  if (Number(prints) === 0) failures.push('mtg_reader reads no print: is the catalog imported?');
  for (const [attempt, statement] of Object.entries(FORBIDDEN_TO_THE_READER)) {
    const refused = await psqlAsReader('begin', statement, 'rollback').then(
      () => false,
      (error) => {
        if (/permission denied/.test(error.stderr)) return true;
        throw error;
      },
    );
    if (!refused) failures.push(`mtg_reader can ${attempt}`);
  }
  return failures;
}

export async function databaseRoleFailures() {
  return [...(await serviceRoleFailures()), ...(await readerFailures())];
}
