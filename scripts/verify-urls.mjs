#!/usr/bin/env node
// Vérifier la validité des URLs Wikimedia pour chaque tableau

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '..');
const FILE_PATH = resolve(ROOT, 'js/data/paintings.js');

const UA = 'NuitAuMusee/1.0 (https://github.com/Thibaud888/game-haiku-various-paintings; personal art-haiku game)';

// Charger paintings.js
let src = readFileSync(FILE_PATH, 'utf8');
function extractData() {
  const start = src.indexOf('const PAINTINGS_DATA = [');
  const end   = src.indexOf('];', start);
  if (start === -1 || end === -1) throw new Error('PAINTINGS_DATA introuvable');
  const arrText = src.slice(start + 'const PAINTINGS_DATA = '.length, end + 1);
  // eslint-disable-next-line no-new-func
  return new Function('return ' + arrText)();
}
const data = extractData();

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function checkUrl(filename, id, title, artist) {
  const url = 'https://commons.wikimedia.org/wiki/Special:FilePath/'
    + encodeURIComponent(filename) + '?width=800';
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: { 'User-Agent': UA },
    });
    if (res.ok) {
      process.stdout.write('✓');
      return true;
    }
    process.stdout.write('✗');
    return false;
  } catch {
    process.stdout.write('✗');
    return false;
  }
}

async function main() {
  console.log(`Vérification de ${data.length} URLs Wikimedia...`);

  const broken = [];

  for (let id = 0; id < data.length; id++) {
    const [title, artist, year, filename] = data[id];
    if (id % 10 === 0) process.stdout.write(`\n[${id}] `);

    const ok = await checkUrl(filename, id, title, artist);
    if (!ok) {
      broken.push({ id, title, artist, filename });
    }

    await sleep(100);
  }

  console.log('\n\n──── Résumé ────');
  console.log(`URLs valides  : ${data.length - broken.length}`);
  console.log(`URLs cassées  : ${broken.length}`);

  if (broken.length) {
    console.log('\nURLs cassées :');
    for (const { id, title, artist, filename } of broken) {
      console.log(`  [#${id}] ${title} — ${artist}`);
      console.log(`       ${filename}`);
    }
  }

  // Sauvegarder le rapport
  const report = {
    timestamp: new Date().toISOString(),
    valid: data.length - broken.length,
    broken,
  };
  writeFileSync(resolve(ROOT, 'scripts/verify-urls-report.json'), JSON.stringify(report, null, 2));
  console.log(`\nRapport: scripts/verify-urls-report.json`);
}

main().catch(err => { console.error(err); process.exit(1); });
