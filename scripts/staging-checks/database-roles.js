// The api signs in as `mtg_reader`, which reads the catalog but can neither write to it nor create
// anything, and has a statement timeout; the importer signs in as `mtg_owner` (ADR 0016).
import { execInService } from './compose-stack.js';

/** The role each service's database URL connects as. */
const SERVICE_ROLES = {
  api: { variable: 'READER_DATABASE_URL', role: 'mtg_reader' },
  importer: { variable: 'OWNER_DATABASE_URL', role: 'mtg_owner' },
};

/**
 * Prints the role the URL in the environment variable `argv[1]` signs in as, over the network and
 * with its password, as the service itself does. The services' image holds Node and `postgres`.
 */
const SIGNED_IN_ROLE_SCRIPT = `
  import postgres from 'postgres';
  const sql = postgres(process.env[process.argv[1]], { max: 1 });
  try {
    const [{ role }] = await sql\`select current_user as role\`;
    console.log(role);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
`;

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
  const failures = [];
  for (const [service, { variable, role }] of Object.entries(SERVICE_ROLES)) {
    const signedIn = await execInService(
      service,
      'node',
      '--input-type=module',
      '-e',
      SIGNED_IN_ROLE_SCRIPT,
      variable,
    ).then(
      (stdout) => stdout.trim(),
      (error) => `nobody (${error.stderr.trim()})`,
    );
    if (signedIn !== role) failures.push(`${service} signs in as ${signedIn}, expected ${role}`);
  }
  return failures;
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
