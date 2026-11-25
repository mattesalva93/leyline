// Umami keeps what visitors did for at most 25 months (ADR 0027): its retention job's SQL,
// run as Umami's role on sample rows on either side of that age, deletes the older ones and keeps
// the others. The rows live in a transaction that never commits, so the check leaves Umami's data
// as it found it. It also fails on a table of visitors' data the job does not cover, such as one a
// new Umami adds.
import { randomUUID } from 'node:crypto';
import { execInService } from './compose-stack.js';

const RETENTION_SQL = '/etc/umami-retention/retention.sql';

/** Umami's own configuration, which the retention keeps however old. */
const CONFIGURATION_TABLES = ['website', 'report', 'segment', 'annotation'];

/** Ages on either side of the retention, as PostgreSQL intervals. */
const AGES = { expired: '26 months', kept: '24 months' };

/** Runs `statements` in one `psql` session as Umami's role, in its retention job's container. */
function psqlAsUmami(...statements) {
  return execInService(
    'umami-retention',
    ...['psql', '-tA', '-v', 'ON_ERROR_STOP=1'],
    ...statements.flatMap((statement) => ['-c', statement]),
  );
}

/** An event, its data, its session and the session's data, all as old as `age`. */
function sampleVisit(age) {
  const [website, session, event] = [randomUUID(), randomUUID(), randomUUID()];
  const createdAt = `now() - interval '${age}'`;
  return {
    website,
    inserts: [
      `insert into session (session_id, website_id, created_at) values ('${session}', '${website}', ${createdAt})`,
      `insert into session_data (session_data_id, website_id, session_id, data_key, data_type, created_at) values ('${randomUUID()}', '${website}', '${session}', 'probe', 1, ${createdAt})`,
      `insert into website_event (event_id, website_id, session_id, visit_id, url_path, created_at) values ('${event}', '${website}', '${session}', '${randomUUID()}', '/', ${createdAt})`,
      `insert into event_data (event_data_id, website_id, website_event_id, data_key, data_type, created_at) values ('${randomUUID()}', '${website}', '${event}', 'probe', 1, ${createdAt})`,
    ],
  };
}

const SAMPLE_TABLES = ['session', 'session_data', 'website_event', 'event_data'];

function rowsLeftQuery(website) {
  return SAMPLE_TABLES.map(
    (table) => `select '${table}', count(*) from ${table} where website_id = '${website}'`,
  ).join(' union all ');
}

async function retentionFailures() {
  const visits = Object.fromEntries(
    Object.entries(AGES).map(([name, age]) => [name, sampleVisit(age)]),
  );
  const output = await psqlAsUmami(
    'begin',
    ...Object.values(visits).flatMap(({ inserts }) => inserts),
    `\\i ${RETENTION_SQL}`,
    ...Object.values(visits).map(({ website }) => rowsLeftQuery(website)),
    'rollback',
  );
  // `-tA` prints each row as `table|count`; the deletes print their own lines, without a `|`.
  const counts = output.split('\n').filter((line) => line.includes('|'));
  const [expired, kept] = [
    counts.slice(0, SAMPLE_TABLES.length),
    counts.slice(SAMPLE_TABLES.length),
  ];
  const failures = [];
  for (const line of expired) {
    const [table, count] = line.split('|');
    if (count !== '0') failures.push(`${table} keeps a row older than ${AGES.expired}`);
  }
  for (const line of kept) {
    const [table, count] = line.split('|');
    if (count !== '1') failures.push(`${table} loses a row only ${AGES.kept} old`);
  }
  return failures;
}

/** Every table of visitors' data: dated, and tied to a website or a session. */
async function coverageFailures() {
  const tables = (
    await psqlAsUmami(
      `select table_name from information_schema.columns where table_schema = 'public'
       and column_name = 'created_at' and table_name in (select table_name from
       information_schema.columns where column_name in ('website_id', 'session_id'))`,
    )
  )
    .split('\n')
    .filter(Boolean)
    .filter((table) => !CONFIGURATION_TABLES.includes(table));
  const covered = await execInService('umami-retention', 'cat', RETENTION_SQL);
  return tables
    .filter((table) => !new RegExp(`^delete from ${table} `, 'm').test(covered))
    .map((table) => `the retention leaves ${table} as it is`);
}

export async function umamiRetentionFailures() {
  return [...(await retentionFailures()), ...(await coverageFailures())];
}
