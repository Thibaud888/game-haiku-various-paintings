#!/usr/bin/env node
// Vérifie que chaque URL d'image du catalogue PAINTINGS répond bien.
// Usage : node scripts/verify-paintings.mjs
//
// Sortie : tableau récapitulatif + liste des entrées en échec.
// Aucune dépendance externe (utilise fetch natif Node 18+).

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Charge le fichier paintings.js de manière brute (évite ES modules / IIFE).
const src = readFileSync(resolve(ROOT, 'js/data/paintings.js'), 'utf8');

// Extrait le tableau PAINTINGS_DATA via évaluation contrôlée.
function extractData() {
  const start = src.indexOf('const PAINTINGS_DATA = [');
  const end   = src.indexOf('];', start);
  if (start === -1 || end === -1) throw new Error('PAINTINGS_DATA introuvable');
  const arrText = src.slice(start + 'const PAINTINGS_DATA = '.length, end + 1);
  // eslint-disable-next-line no-new-func
  return new Function('return ' + arrText)();
}

function wikiImg(filename) {
  return 'https://commons.wikimedia.org/wiki/Special:FilePath/'
       + encodeURIComponent(filename) + '?width=600';
}

const CONCURRENCY = 8;
const TIMEOUT_MS  = 12_000;

async function checkUrl(url) {
  const ctrl = AbortController ? new AbortController() : null;
  const timeout = ctrl ? setTimeout(() => ctrl.abort(), TIMEOUT_MS) : null;
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: ctrl?.signal,
      headers: { 'User-Agent': 'NuitAuMusee-verifier/1.0' },
    });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, status: 0, error: err.message };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function run() {
  const data = extractData();
  console.log(`Vérification de ${data.length} URLs (concurrence: ${CONCURRENCY})…\n`);

  const failures = [];
  let done = 0;

  async function worker(slice) {
    for (const [idx, entry] of slice) {
      const [title, artist, year, file] = entry;
      const url = wikiImg(file);
      const res = await checkUrl(url);
      done++;
      const tag = res.ok ? '✓' : '✗';
      const status = res.status || 'ERR';
      process.stdout.write(`\r[${done}/${data.length}] ${tag} ${status}  `);
      if (!res.ok) {
        failures.push({ idx, title, artist, year, file, status, error: res.error });
      }
    }
  }

  const indexed = data.map((e, i) => [i, e]);
  const chunks = Array.from({ length: CONCURRENCY }, (_, k) =>
    indexed.filter((_, i) => i % CONCURRENCY === k)
  );
  await Promise.all(chunks.map(worker));

  console.log('\n\n──── Récapitulatif ────');
  console.log(`Total testées : ${data.length}`);
  console.log(`Réussies      : ${data.length - failures.length}`);
  console.log(`Échouées      : ${failures.length}`);

  if (failures.length) {
    console.log('\n──── Échecs ────');
    for (const f of failures) {
      console.log(`  [${f.idx}] ${f.title} — ${f.artist} (${f.year})`);
      console.log(`     fichier : ${f.file}`);
      console.log(`     statut  : ${f.status}${f.error ? ' / ' + f.error : ''}`);
    }
    const outPath = resolve(ROOT, 'scripts/failures.json');
    writeFileSync(outPath, JSON.stringify(failures, null, 2));
    console.log(`\nDétails écrits dans ${outPath}`);
  }
}

run().catch(err => { console.error(err); process.exit(1); });
