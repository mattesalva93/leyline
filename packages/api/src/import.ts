// Imports the catalog from Scryfall's `all_cards` bulk file.
//   pnpm import:catalog                          download today's file and import it
//   pnpm import:catalog --file cards.jsonl.gz    import a file downloaded earlier
import { createReadStream } from 'node:fs';
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
    console.log(`Importing ${values.file}`);
    bulk = createReadStream(values.file).compose(createGunzip());
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
