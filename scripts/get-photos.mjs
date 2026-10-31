// Downloads a free-to-use photo for every kind of dish on the menu.
//
//   npm run photos           get any photos that are missing
//   npm run photos:redo      get every photo again from scratch
//   npm run photos:review    make photo-review.html to compare photos and pick better ones
//   node scripts/get-photos.mjs use gyoza "File:Gyoza 001.jpg"    use a photo you picked
//
// Photos come from Wikimedia Commons, where every photo is free to reuse as
// long as you credit the photographer. Credits are saved to
// public/dishes/credits.json and shown on the app's About page.
// Your picks are saved in scripts/photo-picks.json.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'public', 'dishes');
const CREDITS_FILE = join(OUT_DIR, 'credits.json');
const PICKS_FILE = join(ROOT, 'scripts', 'photo-picks.json');
const REVIEW_FILE = join(ROOT, 'photo-review.html');
const API = 'https://commons.wikimedia.org/w/api.php';
// Wikimedia asks every script to say who it is.
const HEADERS = { 'User-Agent': 'MisakiOrderingStudentProject/1.0 (FBLA school project; github.com/laviouyang/MisakiOrdering)' };

const readJson = (file, fallback) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : fallback);
const writeJson = (file, data) => writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
const searches = readJson(join(ROOT, 'scripts', 'photo-searches.json'), {});
const menu = readJson(join(ROOT, 'src', 'data', 'misaki-menu.json'), { items: [] });
const picks = readJson(PICKS_FILE, {});
const credits = readJson(CREDITS_FILE, {});

const args = process.argv.slice(2);
// Words work with or without dashes: "use" or "--use".
const flag = (name) => args.includes(name) || args.includes(`--${name}`);
const after = (name, count = 1) => {
  const at = Math.max(args.indexOf(name), args.indexOf(`--${name}`));
  return at >= 0 ? args.slice(at + 1, at + 1 + count) : [];
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
// Turns "<a href=...>Jane Doe</a>" into "Jane Doe".
const plain = (html = '') => html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const escapeHtml = (text = '') => text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', origin: '*', ...params })}`;
  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) throw new Error(`Wikimedia answered ${response.status}`);
  return response.json();
}

const info = (width) => ({ prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: String(width) });

// A usable photo: a JPEG or PNG, big enough, not a tall narrow shape.
function usable(page) {
  const image = page.imageinfo?.[0];
  if (!image || !['image/jpeg', 'image/png'].includes(image.mime)) return false;
  if (image.width < 500 || image.height < 300 || image.height > image.width * 1.4) return false;
  return !/\b(map|logo|diagram|drawing|icon|label|menu|sign)\b/i.test(page.title);
}

// Search results for one kind of photo, best match first.
async function candidates(key, width, limit = 20) {
  const data = await api({
    action: 'query', generator: 'search', gsrsearch: `${searches[key]} filetype:bitmap`,
    gsrnamespace: '6', gsrlimit: String(limit), ...info(width),
  });
  return Object.values(data.query?.pages ?? {}).sort((a, b) => a.index - b.index).filter(usable);
}

async function lookUp(title) {
  const data = await api({ action: 'query', titles: title, ...info(640) });
  const page = Object.values(data.query?.pages ?? {})[0];
  return page?.imageinfo ? page : null;
}

// Photos already used for other dishes, so no two kinds of dishes share one.
const usedElsewhere = (key) => new Set(Object.entries(credits).filter(([other]) => other !== key).map(([, c]) => `File:${c.title}`));

async function save(key, page) {
  const image = page.imageinfo[0];
  const response = await fetch(image.thumburl ?? image.url, { headers: HEADERS });
  if (!response.ok) throw new Error(`download failed (${response.status})`);
  writeFileSync(join(OUT_DIR, `${key}.jpg`), Buffer.from(await response.arrayBuffer()));
  const meta = image.extmetadata ?? {};
  credits[key] = {
    title: page.title.replace(/^File:/, ''),
    author: plain(meta.Artist?.value) || 'Unknown',
    license: plain(meta.LicenseShortName?.value) || 'See source',
    source: image.descriptionurl,
  };
  writeJson(CREDITS_FILE, credits);
}

async function fetchOne(key) {
  let page = null;
  if (picks[key]) {
    page = await lookUp(picks[key]);
    if (!page) console.warn(`  ${picks[key]} wasn't found, so searching instead.`);
  }
  if (!page) {
    const taken = usedElsewhere(key);
    page = (await candidates(key, 640)).find((candidate) => !taken.has(candidate.title));
  }
  if (!page) return false;
  await save(key, page);
  return true;
}

// --use KEY "File:Title": save a photo you picked and download it.
async function usePick() {
  const [key, rawTitle] = after('use', 2);
  if (!key || !rawTitle) throw new Error('Use it like this: node scripts/get-photos.mjs use gyoza "File:Gyoza 001.jpg"');
  if (!searches[key]) throw new Error(`No photo type called "${key}". The names are in scripts/photo-searches.json.`);
  const title = rawTitle.startsWith('File:') ? rawTitle : `File:${rawTitle}`;
  const page = await lookUp(title);
  if (!page) throw new Error(`Couldn't find ${title} on Wikimedia Commons. Check the spelling.`);
  picks[key] = title;
  writeJson(PICKS_FILE, picks);
  await save(key, page);
  console.log(`✓ ${key} now uses ${title}. Refresh the app to see it.`);
}

// --review: a page showing each photo with other choices to pick from.
async function review() {
  const dishesFor = {};
  for (const item of menu.items) if (item.photo) (dishesFor[item.photo] ??= []).push(item.name);
  const keys = Object.keys(searches);
  const sections = [];
  for (const [index, key] of keys.entries()) {
    process.stdout.write(`\rLooking up choices ${index + 1}/${keys.length}…`);
    let options = [];
    try { options = (await candidates(key, 300, 30)).slice(0, 8); } catch { /* show what we have */ }
    const current = credits[key] ? `<img class="current" src="public/dishes/${key}.jpg" alt="">` : '<div class="current none">No photo yet</div>';
    const cards = options.map((page) => {
      const command = `node scripts/get-photos.mjs use ${key} "${page.title.replace(/"/g, '')}"`;
      const chosen = credits[key] && page.title === `File:${credits[key].title}`;
      return `<figure class="${chosen ? 'chosen' : ''}"><img src="${escapeHtml(page.imageinfo[0].thumburl)}" alt="" loading="lazy">
        <button data-command="${escapeHtml(command)}">${chosen ? 'In use' : 'Use this'}</button></figure>`;
    }).join('');
    sections.push(`<section><div class="side">${current}<h2>${escapeHtml(key)}</h2><p>${escapeHtml((dishesFor[key] ?? []).join(', '))}</p></div>
      <div class="options">${cards || '<p>No other choices found. Try changing the search words in scripts/photo-searches.json.</p>'}</div></section>`);
    await sleep(150);
  }
  writeFileSync(REVIEW_FILE, `<!doctype html><html><head><meta charset="utf-8"><title>Misaki photo review</title><style>
body{font-family:system-ui,sans-serif;margin:24px;background:#f7f2e8;color:#1c2954}
header{position:sticky;top:0;background:#1c2954;color:#fff;padding:12px 16px;border-radius:10px;margin-bottom:16px}
header code{background:#ffffff22;padding:2px 6px;border-radius:4px}
section{display:flex;gap:16px;background:#fff;border-radius:12px;padding:14px;margin-bottom:12px}
.side{width:220px;flex:none}.side h2{font-size:15px;margin:8px 0 4px}.side p{font-size:12px;color:#5c6378;margin:0}
.current{width:220px;height:150px;object-fit:cover;border-radius:8px;border:3px solid #c8402e}.none{display:grid;place-items:center;background:#eee}
.options{display:flex;flex-wrap:wrap;gap:10px}figure{margin:0;width:150px}
figure img{width:150px;height:105px;object-fit:cover;border-radius:6px;display:block}
figure.chosen img{outline:3px solid #5f8a4e}
button{margin-top:4px;width:100%;border:0;border-radius:6px;padding:6px;background:#e3ecd9;color:#2f4a2a;font-weight:700;cursor:pointer}
button.copied{background:#5f8a4e;color:#fff}
</style></head><body>
<header><strong>Pick better photos.</strong> Click <b>Use this</b> to copy a command, paste it into the terminal (in the MisakiOrdering folder) and press Enter. The red box is the photo in use now.</header>
${sections.join('\n')}
<script>
document.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-command]'); if (!button) return;
  const command = button.dataset.command;
  try { await navigator.clipboard.writeText(command); button.textContent = 'Copied! Paste in terminal'; button.classList.add('copied'); }
  catch { prompt('Copy this command, then paste it into the terminal:', command); }
});
</script></body></html>`);
  console.log(`\n\nOpen this file in your browser:\n  ${REVIEW_FILE}`);
}

async function main() {
  if (typeof fetch !== 'function') throw new Error('This needs Node.js 18 or newer. Check with: node --version');
  mkdirSync(OUT_DIR, { recursive: true });
  if (flag('use')) return usePick();
  if (flag('review')) return review();

  const force = flag('force');
  if (force) for (const key of Object.keys(credits)) if (!searches[key]) delete credits[key];
  const keys = Object.keys(searches);
  let saved = 0, skipped = 0;
  const missing = [];
  // Hand-picked photos go first, so searches don't take them for another dish.
  keys.sort((a, b) => Number(Boolean(picks[b])) - Number(Boolean(picks[a])));
  if (force) for (const key of keys) delete credits[key];

  for (const key of keys) {
    if (!force && existsSync(join(OUT_DIR, `${key}.jpg`)) && credits[key]) { skipped += 1; continue; }
    try {
      if (await fetchOne(key)) { saved += 1; console.log(`✓ ${key}: ${credits[key].title}`); }
      else { missing.push(key); console.log(`✗ ${key}: no good photo found`); }
    } catch (error) {
      missing.push(key);
      console.log(`✗ ${key}: ${error.message}`);
    }
    await sleep(300); // be polite to Wikimedia
  }

  console.log(`\nDone. ${saved} downloaded, ${skipped} already there, ${missing.length} missing.`);
  if (missing.length) console.log(`Missing: ${missing.join(', ')}\nThose dishes keep the "Add a photo" box.`);
  console.log('To compare photos and pick better ones: npm run photos:review');
}

main().catch((error) => { console.error(`\nCouldn't get photos: ${error.message}`); process.exit(1); });
