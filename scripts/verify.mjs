#!/usr/bin/env node
// Vérification du repo : syntaxe de tout le JS (front + serveur), sans rien exécuter.
// Usage : node scripts/verify.mjs — la session Claude doit le lancer avant de conclure.
import { execSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name.endsWith(".js") || name.endsWith(".mjs")) files.push(p);
  }
};
walk(".");

let bad = 0;
for (const f of files) {
  try {
    execSync(`node --check "${f}"`, { stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    bad++;
    console.error(`✗ ${f}\n${e.stderr}`);
  }
}
if (bad) {
  console.error(`VERIFY ÉCHEC : ${bad} fichier(s) JS en erreur de syntaxe.`);
  process.exit(1);
}
console.log(`VERIFY OK : ${files.length} fichiers JS valides.`);

// Vérification optionnelle des URLs Wikimedia (peut être long, activé avec VERIFY_URLS=1)
if (process.env.VERIFY_URLS === '1') {
  console.log('\nVérification des URLs Wikimedia...');
  try {
    execSync('node scripts/verify-urls.mjs', { stdio: 'inherit' });
  } catch (e) {
    console.error('\nVERIFY ÉCHEC : Des URLs Wikimedia sont cassées.');
    process.exit(1);
  }
}
