// Downloads a free-to-use photo for every kind of dish on the menu.
//
// Run it with:  npm run photos
//
// Photos come from Wikimedia Commons, where every photo is free to reuse as
// long as you credit the photographer. Credits are saved to
// public/dishes/credits.json and shown on the app's About page.
//
// - Photos that are already downloaded are skipped. Add --force to get them all again.
// - To redo one photo:          npm run photos -- --only gyoza
// - To pick a specific photo:   find it on commons.wikimedia.org, then put its
//   title in scripts/photo-picks.json, like  { "gyoza": "File:Gyoza 001.jpg" }

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'public', 'dishes');
const CREDITS_FILE = join(OUT_DIR, 'credits.json');
const API = 'https://commons.wikimedia.org/w/api.php';
// Wikimedia asks every script to say who it is.
const HEADERS = { 'User-Agent': 'MisakiOrderingStudentProject/1.0 (FBLA school project; github.com/laviouyang/MisakiOrdering)' };
const WIDTH = 640;

const readJson = (file, fallback) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : fallback);
const searches = readJson(join(ROOT, 'scripts', 'photo-searches.json'), {});
const picks = readJson(join(ROOT, 'scripts', 'photo-picks.json'), {});
const credits = readJson(CREDITS_FILE, {});

const args = process.argv.slice(2);
const force = args.includes('--force');
const onlyIndex = args.indexOf('--only');
const only = onlyIndex >= 0 ? args[onlyIndex + 1] : null;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
// Turns "<a href=...>Jane Doe</a>" into "Jane Doe".
const plain = (html = '') => html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', origin: '*', ...params })}`;
  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) throw new Error(`Wikimedia answered ${response.status}`);
  return response.json();
}

const INFO = { prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: String(WIDTH) };

// A usable photo: a JPEG or PNG, big enough, not a tall narrow shape.
function usable(page) {
  const info = page.imageinfo?.[0];
  if (!info || !['image/jpeg', 'image/png'].includes(info.mime)) return false;
  if (info.width < 500 || info.height < 300 || info.height > info.width * 1.4) return false;
  return !/\b(map|logo|diagram|drawing|icon|label|menu|sign)\b/i.test(page.title);
}

async function findPhoto(key) {
  if (picks[key]) {
    const data = await api({ action: 'query', titles: picks[key], ...INFO });
    const page = Object.values(data.query?.pages ?? {})[0];
    if (page?.imageinfo) return page;
    console.warn(`  ${picks[key]} wasn't found, so searching instead.`);
  }
  const data = await api({
    action: 'query', generator: 'search', gsrsearch: `${searches[key]} filetype:bitmap`,
    gsrnamespace: '6', gsrlimit: '15', ...INFO,
  });
  return Object.values(data.query?.pages ?? {})
    .sort((a, b) => a.index - b.index) // keep Wikimedia's best-match order
    .find(usable);
}

async function main() {
  if (typeof fetch !== 'function') throw new Error('This needs Node.js 18 or newer. Check with: node --version');
  mkdirSync(OUT_DIR, { recursive: true });
  const keys = only ? [only] : Object.keys(searches);
  if (only && !searches[only]) throw new Error(`No photo type called "${only}". The names are in scripts/photo-searches.json.`);
  let saved = 0, skipped = 0;
  const missing = [];

  for (const key of keys) {
    const file = join(OUT_DIR, `${key}.jpg`);
    if (!force && !only && existsSync(file) && credits[key]) { skipped += 1; continue; }
    try {
      const page = await findPhoto(key);
      if (!page) { missing.push(key); console.log(`✗ ${key}: no good photo found`); continue; }
      const info = page.imageinfo[0];
      const image = await fetch(info.thumburl ?? info.url, { headers: HEADERS });
      if (!image.ok) throw new Error(`download failed (${image.status})`);
      writeFileSync(file, Buffer.from(await image.arrayBuffer()));
      const meta = info.extmetadata ?? {};
      credits[key] = {
        title: page.title.replace(/^File:/, ''),
        author: plain(meta.Artist?.value) || 'Unknown',
        license: plain(meta.LicenseShortName?.value) || 'See source',
        source: info.descriptionurl,
      };
      writeFileSync(CREDITS_FILE, `${JSON.stringify(credits, null, 2)}\n`);
      saved += 1;
      console.log(`✓ ${key}: ${credits[key].title}`);
    } catch (error) {
      missing.push(key);
      console.log(`✗ ${key}: ${error.message}`);
    }
    await sleep(300); // be polite to Wikimedia
  }

  console.log(`\nDone. ${saved} downloaded, ${skipped} already there, ${missing.length} missing.`);
  if (missing.length) console.log(`Missing: ${missing.join(', ')}\nThose dishes keep the "Add a photo" box. Run this again later, or pick photos in scripts/photo-picks.json.`);
}

main().catch((error) => { console.error(`\nCouldn't get photos: ${error.message}`); process.exit(1); });
