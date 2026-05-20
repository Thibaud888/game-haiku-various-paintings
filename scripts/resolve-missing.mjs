#!/usr/bin/env node
// Pour chaque tableau dont l'image n'a pas pu être téléchargée, ce script
// interroge l'API Wikipedia pour trouver automatiquement le bon fichier
// Wikimedia Commons, le télécharge, et met à jour js/data/paintings.js.
//
// Usage : node scripts/resolve-missing.mjs
//
// Stratégie :
//   1. OpenSearch Wikipedia : trouver l'article correspondant
//   2. pageimages API : extraire l'image principale (infobox)
//   3. Si échec, fallback sur la recherche Commons
//   4. Tester le téléchargement avant de valider
//   5. Mettre à jour paintings.js avec les filenames qui marchent

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '..');
const IMG_DIR   = resolve(ROOT, 'images');
const FILE_PATH = resolve(ROOT, 'js/data/paintings.js');

const DELAY_MS = 400;
const UA = 'NuitAuMusee/1.0 (https://github.com/Thibaud888/game-haiku-various-paintings; personal art-haiku game)';

mkdirSync(IMG_DIR, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Chargement de paintings.js ─────────────────────────
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

// ── Recherche d'un filename via les APIs Wikipedia/Commons ──

async function findViaWikipediaPageImage(query) {
  // 1) OpenSearch pour trouver les articles candidats
  const searchUrl = 'https://en.wikipedia.org/w/api.php?'
    + 'action=opensearch&limit=5&namespace=0&format=json'
    + '&search=' + encodeURIComponent(query);
  const sJson = await fetchJson(searchUrl);
  if (!sJson) return [];
  const titles = sJson[1] || [];
  if (!titles.length) return [];

  // 2) Récupération des pageimages pour chaque article candidat
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

// ── Résolution d'un tableau manquant ───────────────────

async function resolveOne(id, title, artist, year, oldFile) {
  const candidates = new Set();

  // Stratégie 1 : OpenSearch + pageimages avec plusieurs requêtes
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

  // Stratégie 2 : Commons search en fallback
  if (candidates.size === 0) {
    const found = await findViaCommonsSearch(`${title} ${artist}`);
    found.forEach(f => candidates.add(f));
    await sleep(DELAY_MS);
  }

  candidates.delete(oldFile); // pas la peine de retester celui qui a déjà échoué

  for (const candidate of candidates) {
    process.stdout.write(`\n    essai: ${candidate.slice(0, 70)}${candidate.length > 70 ? '…' : ''}`);
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

// ── Main ───────────────────────────────────────────────

async function main() {
  console.log(`Résolution des images manquantes (sur ${data.length} tableaux)`);

  const fixes = []; // {id, oldFile, newFile}
  const unresolved = [];

  for (let id = 0; id < data.length; id++) {
    const [title, artist, year, oldFile] = data[id];
    const localPath = resolve(IMG_DIR, `${id}.jpg`);
    if (existsSync(localPath) && statSync(localPath).size > 1024) continue;

    process.stdout.write(`\n[#${id}] ${title} — ${artist}`);
    const newFile = await resolveOne(id, title, artist, year, oldFile);
    if (newFile) {
      fixes.push({ id, oldFile, newFile });
    } else {
      unresolved.push({ id, title, artist, year, oldFile });
      process.stdout.write(`\n    → aucun candidat valide`);
    }
  }

  console.log('\n\n──── Résumé ────');
  console.log(`Résolus    : ${fixes.length}`);
  console.log(`Non résolus: ${unresolved.length}`);

  // ── Appliquer les fixes à paintings.js ──
  if (fixes.length) {
    let updated = src;
    for (const { oldFile, newFile } of fixes) {
      // Échappement simple pour le remplacement de chaîne (pas regex)
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

  // Rapport JSON
  const report = {
    timestamp: new Date().toISOString(),
    resolved: fixes,
    unresolved,
  };
  writeFileSync(resolve(ROOT, 'scripts/resolve-report.json'), JSON.stringify(report, null, 2));
  console.log(`\nRapport: scripts/resolve-report.json`);

  if (unresolved.length) {
    console.log('\nLes tableaux non résolus restent dans paintings.js avec un fallback stylisé.');
    console.log('Vous pouvez supprimer ces entrées si vous préférez une collection plus stricte.');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
