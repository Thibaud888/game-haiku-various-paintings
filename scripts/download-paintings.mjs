#!/usr/bin/env node
// Télécharge toutes les images du catalogue PAINTINGS dans le dossier ./images
// et génère un rapport scripts/download-report.json.
//
// Usage  : node scripts/download-paintings.mjs
// Options:
//   --force      retélécharger même les fichiers déjà présents
//   --width=N    largeur cible (défaut 800)
//   --conc=N     nombre de téléchargements simultanés (défaut 2 — Wikimedia rate-limite)
//   --delay=N    délai (ms) entre requêtes d'un même worker (défaut 250)
//
// Politesse : respecte les limites Wikimedia (concurrence faible + délais
// + retry exponentiel sur 429 + User-Agent identifiant).

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '..');
const IMG_DIR   = resolve(ROOT, 'images');

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      return [k, v ?? true];
    }
    return [a, true];
  })
);
const WIDTH       = parseInt(args.width, 10) || 800;
const CONCURRENCY = parseInt(args.conc,  10) || 2;
const DELAY_MS    = parseInt(args.delay, 10) || 250;
const FORCE       = !!args.force;
const TIMEOUT_MS  = 30_000;
const MAX_RETRY   = 4;

mkdirSync(IMG_DIR, { recursive: true });

const src = readFileSync(resolve(ROOT, 'js/data/paintings.js'), 'utf8');
function extractData() {
  const start = src.indexOf('const PAINTINGS_DATA = [');
  const end   = src.indexOf('];', start);
  if (start === -1 || end === -1) throw new Error('PAINTINGS_DATA introuvable');
  const arrText = src.slice(start + 'const PAINTINGS_DATA = '.length, end + 1);
  // eslint-disable-next-line no-new-func
  return new Function('return ' + arrText)();
}
const data = extractData();

function wikiUrl(filename, width = WIDTH) {
  return 'https://commons.wikimedia.org/wiki/Special:FilePath/'
       + encodeURIComponent(filename) + '?width=' + width;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Téléchargement avec retry exponentiel sur 429 ────────
async function downloadOne(id, file, attempt = 1) {
  const dest = resolve(IMG_DIR, `${id}.jpg`);
  if (!FORCE && existsSync(dest) && statSync(dest).size > 1024) {
    return { id, status: 'skipped', file };
  }

  const url  = wikiUrl(file);
  const ctrl = new AbortController();
  const t    = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'NuitAuMusee/1.0 (https://github.com/Thibaud888/game-haiku-various-paintings; personal art-haiku game)',
      },
    });

    if (res.status === 429) {
      if (attempt < MAX_RETRY) {
        clearTimeout(t);
        const wait = 2000 * Math.pow(2, attempt - 1); // 2s, 4s, 8s, 16s
        process.stdout.write(`\n  [#${id}] 429 — retry dans ${wait}ms (tentative ${attempt + 1}/${MAX_RETRY})`);
        await sleep(wait);
        return downloadOne(id, file, attempt + 1);
      }
      return { id, status: 'fail', file, httpStatus: 429, note: 'rate limited after retries' };
    }

    if (!res.ok) {
      return { id, status: 'fail', file, httpStatus: res.status };
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1024) {
      return { id, status: 'fail', file, httpStatus: res.status, note: 'response too small' };
    }
    writeFileSync(dest, buf);
    return { id, status: 'ok', file, bytes: buf.length };
  } catch (err) {
    return { id, status: 'fail', file, error: err.message };
  } finally {
    clearTimeout(t);
  }
}

// ── Pool concurrent avec délai entre les requêtes d'un même worker ──
async function runPool(items, concurrency, worker, onProgress) {
  let cursor = 0;
  let done = 0;
  const results = [];

  async function workerLoop() {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      const r = await worker(items[i]);
      results.push(r);
      done++;
      onProgress?.(done, items.length, r);
      // Délai poli entre requêtes (sauf la dernière)
      if (cursor < items.length) await sleep(DELAY_MS);
    }
  }

  const workers = Array.from({ length: concurrency }, workerLoop);
  await Promise.all(workers);
  return results;
}

// ── Main ───────────────────────────────────────────────────
async function main() {
  console.log(`Téléchargement de ${data.length} images vers ./images`);
  console.log(`Concurrence: ${CONCURRENCY}, délai: ${DELAY_MS}ms, largeur: ${WIDTH}px, force: ${FORCE}`);
  console.log('');

  const items = data.map(([title, artist, year, file], id) =>
    ({ id, title, artist, year, file })
  );

  const results = await runPool(items, CONCURRENCY,
    async (item) => {
      const r = await downloadOne(item.id, item.file);
      return { ...item, ...r };
    },
    (done, total, r) => {
      const tag = r.status === 'ok' ? '✓' : r.status === 'skipped' ? '·' : '✗';
      const sizeKB = r.bytes ? `${Math.round(r.bytes / 1024)}KB` : '';
      process.stdout.write(`\r[${done}/${total}] ${tag} #${r.id}  ${sizeKB}              `);
    }
  );

  console.log('\n');

  const ok   = results.filter(r => r.status === 'ok');
  const skip = results.filter(r => r.status === 'skipped');
  const fail = results.filter(r => r.status === 'fail');
  const totalBytes = ok.reduce((s, r) => s + (r.bytes || 0), 0);

  console.log('──── Récapitulatif ────');
  console.log(`Téléchargées : ${ok.length}`);
  console.log(`Déjà présentes : ${skip.length}`);
  console.log(`Échecs        : ${fail.length}`);
  console.log(`Volume total  : ${(totalBytes / 1024 / 1024).toFixed(1)} MB`);

  if (fail.length) {
    console.log('\n──── Échecs ────');
    for (const f of fail) {
      console.log(`  [#${f.id}] ${f.title} — ${f.artist} (${f.year})`);
      console.log(`     fichier WMC : ${f.file}`);
      console.log(`     erreur      : ${f.httpStatus ?? ''} ${f.error ?? f.note ?? ''}`);
    }
  }

  const reportPath = resolve(ROOT, 'scripts/download-report.json');
  writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    total: data.length,
    ok: ok.length,
    skipped: skip.length,
    failed: fail.length,
    failures: fail.map(f => ({
      id: f.id, title: f.title, artist: f.artist, year: f.year,
      file: f.file, httpStatus: f.httpStatus, error: f.error, note: f.note,
    })),
  }, null, 2));
  console.log(`\nRapport complet : ${reportPath}`);
}

main().catch(err => { console.error(err); process.exit(1); });
