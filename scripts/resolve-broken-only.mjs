#!/usr/bin/env node
// Résoudre UNIQUEMENT les images cassées détectées par verify-urls.mjs
// Prend les IDs du rapport verify-urls-report.json et cherche les bons filenames

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '..');
const IMG_DIR   = resolve(ROOT, 'images');
const FILE_PATH = resolve(ROOT, 'js/data/paintings.js');
const REPORT_PATH = resolve(ROOT, 'scripts/verify-urls-report.json');

const DELAY_MS = 300;
const UA = 'NuitAuMusee/1.0 (https://github.com/Thibaud888/game-haiku-various-paintings; personal art-haiku game)';

mkdirSync(IMG_DIR, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Charger données ────────────────────────────────────
let src = readFileSync(FILE_PATH, 'utf8');
function extractData() {
  const start = src.indexOf('const PAINTINGS_DATA = [');
  const end   = src.indexOf('];', start);
  if (start === -1 || end === -1) throw new Error('PAINTINGS_DATA introuvable');
  const arrText = src.slice(start + 'const PAINTINGS_DATA = '.length, end + 1);
  return new Function('return ' + arrText)();
}
const data = extractData();

const report = JSON.parse(readFileSync(REPORT_PATH, 'utf8'));
const brokenIds = new Set(report.broken.map(b => b.id));

console.log(`Résolution de ${brokenIds.size} images cassées`);

// ── Helpers réseau ─────────────────────────────────────
async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;
  return res.json();
}

async function tryDownload(filename, id) {
  const url = 'https://commons.wikimedia.org/wiki/Special:FilePath/'
    + encodeURIComponent(filename) + '?width=800';
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': UA },
      timeout: 5000,
    });
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1024) return false;
    writeFileSync(resolve(IMG_DIR, `${id}.jpg`), buf);
    return true;
  } catch {
    return false;
  }
}

async function findViaWikipediaPageImage(query) {
  const searchUrl = 'https://en.wikipedia.org/w/api.php?'
    + 'action=opensearch&limit=5&namespace=0&format=json'
    + '&search=' + encodeURIComponent(query);
  const sJson = await fetchJson(searchUrl);
  if (!sJson) return [];
  const titles = sJson[1] || [];
  if (!titles.length) return [];

  await sleep(DELAY_MS);
  const titlesParam = titles.map(encodeURIComponent).join('|');
  const piUrl = 'https://en.wikipedia.org/w/api.php?'
    + 'action=query&format=json&prop=pageimages&piprop=name'
    + '&titles=' + titlesParam;
  const piJson = await fetchJson(piUrl);
  if (!piJson) return [];

  const pages = piJson.query?.pages || {};
  const filenames = [];
  for (const page of Object.values(pages)) {
    if (page.pageimage) filenames.push(page.pageimage);
  }
  return filenames;
}

async function findViaCommonsSearch(query) {
  const url = 'https://commons.wikimedia.org/w/api.php?'
    + 'action=query&list=search&srnamespace=6&srlimit=10&format=json'
    + '&srsearch=' + encodeURIComponent(query);
  const json = await fetchJson(url);
  if (!json) return [];
  return (json.query?.search || [])
    .map(h => h.title.replace(/^File:/, ''))
    .filter(name => /\.(jpe?g|png|tiff?)$/i.test(name));
}

async function resolveOne(id, title, artist, year, oldFile) {
  const candidates = new Set();

  const queries = [
    `${title} ${artist}`,
    `${title} ${artist} painting`,
    `${title} painting`,
  ];
  for (const q of queries) {
    const found = await findViaWikipediaPageImage(q);
    found.forEach(f => candidates.add(f));
    await sleep(DELAY_MS);
    if (candidates.size >= 3) break;
  }

  if (candidates.size === 0) {
    const found = await findViaCommonsSearch(`${title} ${artist}`);
    found.forEach(f => candidates.add(f));
    await sleep(DELAY_MS);
  }

  candidates.delete(oldFile);

  for (const candidate of candidates) {
    process.stdout.write(`\n    essai: ${candidate.slice(0, 60)}${candidate.length > 60 ? '…' : ''}`);
    const ok = await tryDownload(candidate, id);
    await sleep(DELAY_MS);
    if (ok) {
      process.stdout.write(`  ✓`);
      return candidate;
    }
    process.stdout.write(`  ✗`);
  }
  return null;
}

async function main() {
  const fixes = [];
  const unresolved = [];

  let processed = 0;
  for (const id of brokenIds) {
    const [title, artist, year, oldFile] = data[id];
    process.stdout.write(`\n[#${id}] ${title.slice(0, 50)} — ${artist.slice(0, 30)}`);

    const newFile = await resolveOne(id, title, artist, year, oldFile);
    if (newFile) {
      fixes.push({ id, oldFile, newFile });
    } else {
      unresolved.push({ id, title, artist, year, oldFile });
      process.stdout.write(`\n    → non résolu`);
    }

    processed++;
    if (processed % 20 === 0) {
      console.log(`\n[${processed}/${brokenIds.size}]`);
    }
  }

  console.log('\n\n──── Résumé ────');
  console.log(`Résolus    : ${fixes.length}`);
  console.log(`Non résolus: ${unresolved.length}`);

  if (fixes.length) {
    let updated = src;
    for (const { oldFile, newFile } of fixes) {
      const needle = `'${oldFile}'`;
      const replacement = `'${newFile.replace(/'/g, "\\'")}'`;
      if (updated.indexOf(needle) === -1) {
        console.warn(`! Impossible de trouver "${oldFile}" dans paintings.js`);
        continue;
      }
      updated = updated.replace(needle, replacement);
    }
    writeFileSync(FILE_PATH, updated);
    console.log(`\n✓ paintings.js mis à jour avec ${fixes.length} corrections`);
  }

  const finalReport = {
    timestamp: new Date().toISOString(),
    brokenCount: brokenIds.size,
    resolved: fixes,
    unresolved,
  };
  writeFileSync(resolve(ROOT, 'scripts/resolve-broken-report.json'), JSON.stringify(finalReport, null, 2));
  console.log(`\nRapport: scripts/resolve-broken-report.json`);
}

main().catch(err => { console.error(err); process.exit(1); });
