// The api signs in as `leyline_reader`, which reads the catalog but can neither write to it nor
// create anything, and has a statement timeout; the importer signs in as `leyline_owner` (ADR 0016).
// Umami and its retention job sign in as `umami`, to a database of its own that the catalog's roles
// cannot open, as `umami` cannot open the catalog's (ADR 0027).
import { execInService } from './compose-stack.js';
import { serviceVariables } from './error-reports.js';

/** The role each service's database URL connects as. */
const SERVICE_ROLES = {
  api: { variable: 'READER_DATABASE_URL', role: 'leyline_reader' },
  importer: { variable: 'OWNER_DATABASE_URL', role: 'leyline_owner' },
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

/** Statements `leyline_reader` must be refused, each in a transaction that never commits. */
const FORBIDDEN_TO_THE_READER = {
  'insert into the catalog': 'insert into catalog_imports values (now())',
  'delete from the catalog': 'delete from prints',
  'create a table': 'create table check_staging_probe (id int)',
  'create a temporary table': 'create temporary table check_staging_probe (id int)',
  'create a schema': 'create schema check_staging_probe',
};

/** Umami's database, which only its role opens. */
const UMAMI_DATABASE = 'umami';

/**
 * Runs `statements` as `role` in `database`, the catalog's by default, over the container's own
 * socket. `-tA` prints bare values; ON_ERROR_STOP makes psql exit with an error at the first
 * failing statement.
 */
function psqlAs(role, statements, database = '"$POSTGRES_DB"') {
  return execInService(
    'postgres',
    'sh',
    '-c',
    `psql -U ${role} -d ${database} -tA -v ON_ERROR_STOP=1 "$@"`,
    'psql',
    ...statements.flatMap((statement) => ['-c', statement]),
  );
}

function psqlAsReader(...statements) {
  return psqlAs('leyline_reader', statements);
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
  if (timeout === '0') failures.push('leyline_reader has no statement timeout');
  if (Number(prints) === 0)
    failures.push('leyline_reader reads no print: is the catalog imported?');
  for (const [attempt, statement] of Object.entries(FORBIDDEN_TO_THE_READER)) {
    const refused = await psqlAsReader('begin', statement, 'rollback').then(
      () => false,
      (error) => {
        if (/permission denied/.test(error.stderr)) return true;
        throw error;
      },
    );
    if (!refused) failures.push(`leyline_reader can ${attempt}`);
  }
  return failures;
}

/** Whether `role` is refused a connection to `database`, rather than let in or failing otherwise. */
async function connectionRefused(role, database) {
  return psqlAs(role, ['select 1'], database).then(
    () => false,
    (error) => {
      if (/permission denied for database/.test(error.stderr)) return true;
      throw error;
    },
  );
}

/**
 * Umami's image has no Postgres client for Node, so its URL names the role; its retention job
 * signs in for real with the same password, through `psql` and libpq's PG* variables.
 */
async function umamiRoleFailures() {
  const failures = [];
  const umamiUrl = new URL((await serviceVariables('umami')).DATABASE_URL);
  const umamiSignsInAs = `${umamiUrl.username} to ${umamiUrl.pathname.slice(1)}`;
  if (umamiSignsInAs !== `umami to ${UMAMI_DATABASE}`)
    failures.push(`umami signs in as ${umamiSignsInAs}, expected umami to ${UMAMI_DATABASE}`);
  const retentionRole = await execInService(
    'umami-retention',
    ...['psql', '-tA', '-c', "select current_user || ' to ' || current_database()"],
  ).then(
    (stdout) => stdout.trim(),
    (error) => `nobody (${error.stderr.trim()})`,
  );
  if (retentionRole !== `umami to ${UMAMI_DATABASE}`)
    failures.push(
      `umami-retention signs in as ${retentionRole}, expected umami to ${UMAMI_DATABASE}`,
    );
  if (!(await connectionRefused('umami', '"$POSTGRES_DB"')))
    failures.push("umami opens the catalog's database");
  for (const catalogRole of ['leyline_owner', 'leyline_reader']) {
    if (!(await connectionRefused(catalogRole, UMAMI_DATABASE)))
      failures.push(`${catalogRole} opens Umami's database`);
  }
  return failures;
}

export async function databaseRoleFailures() {
  return [
    ...(await serviceRoleFailures()),
    ...(await readerFailures()),
    ...(await umamiRoleFailures()),
  ];
}
