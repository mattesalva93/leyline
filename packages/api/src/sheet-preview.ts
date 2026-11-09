// Renders a proxy sheet to PNG, to look at the layout without opening the app.
//   pnpm sheet:preview                      a built-in decklist covering the layout's hard cases
//   pnpm sheet:preview --file deck.txt      a decklist of your own
// Needs the catalog in PostgreSQL (pnpm db:up, pnpm import:catalog) and `pdftoppm`
// (brew install poppler). Writes .preview/sheet.pdf and .preview/sheet-<page>.png.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import {
  defaultSheetOptions,
  generateSheetPdf,
  resolveDecklist,
  sheetImageUrls,
} from '@mtg-suite/core';
import { connect } from './db.ts';
import { databaseUrl } from './env.ts';
import { createPostgresCatalog } from './postgres-catalog.ts';
import { downloadImages } from './scryfall.ts';

/**
 * More than one page, white- and black-bordered cards (Scryfall paints their corners in
 * different colours), double-faced cards, and a pair that does not fit at the end of a row.
 */
const DEFAULT_DECKLIST = `4 Street Wraith
3 Shambling Ghast
2 Fable of the Mirror-Breaker
1 Lightning Bolt
1 Delver of Secrets
2 Orcish Bowmasters`;

const { values } = parseArgs({ options: { file: { type: 'string' } } });
// pnpm runs the script in packages/api; INIT_CWD is where `pnpm` was typed.
const text = values.file
  ? readFileSync(resolve(process.env.INIT_CWD ?? process.cwd(), values.file), 'utf8')
  : DEFAULT_DECKLIST;
const outDir = fileURLToPath(new URL('../../../.preview/', import.meta.url));

const sql = connect(databaseUrl());
try {
  const today = new Date().toISOString().slice(0, 10);
  const lines = await resolveDecklist(text, createPostgresCatalog(sql), { today, lang: 'en' });
  for (const line of lines.filter((line) => line.status !== 'resolved' || !line.defaultPrint)) {
    console.warn(`Not printed (${line.status}): ${line.text}`);
  }
  const sheet = { options: defaultSheetOptions, lines };
  const pdf = await generateSheetPdf(sheet, await downloadImages(sheetImageUrls(sheet)));

  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  const pdfPath = resolve(outDir, 'sheet.pdf');
  writeFileSync(pdfPath, pdf);
  // -png writes one image per page, -r is the resolution in DPI.
  const render = spawnSync('pdftoppm', ['-png', '-r', '100', pdfPath, resolve(outDir, 'sheet')], {
    stdio: 'inherit',
  });
  if (render.error)
    throw new Error('pdftoppm not found: brew install poppler', { cause: render.error });
  if (render.status !== 0) throw new Error(`pdftoppm exited with ${render.status}`);
  console.log(`Wrote ${pdfPath} and one PNG per page next to it`);
} finally {
  await sql.end();
}
