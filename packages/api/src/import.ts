// Imports the catalog from Scryfall's `all_cards` bulk file.
//   pnpm import:catalog                          download today's file and import it
//   pnpm import:catalog --file cards.jsonl.gz    import a file downloaded earlier
import { createReadStream } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { createGunzip } from 'node:zlib';
import { connect, migrate } from './db.ts';
import { importBulk } from './import-bulk.ts';
import { databaseUrl } from './env.ts';
import { allCardsBulkUrl, downloadBulk } from './scryfall.ts';

const { values } = parseArgs({ options: { file: { type: 'string' } } });

const sql = connect(databaseUrl());
try {
  await migrate(sql);
  let bulk;
  if (values.file) {
    // pnpm runs the script in packages/api; INIT_CWD is where `pnpm` was typed.
    const file = resolve(process.env.INIT_CWD ?? process.cwd(), values.file);
    console.log(`Importing ${file}`);
    bulk = createReadStream(file).compose(createGunzip());
  } else {
    const url = await allCardsBulkUrl();
    console.log(`Downloading and importing ${url}`);
    bulk = await downloadBulk(url);
  }
  const { prints } = await importBulk(sql, bulk);
  console.log(`Imported ${prints} prints`);
} finally {
  await sql.end();
}
